#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './_shared.mjs';

const ADVISORY_RULES = new Set(['PBC-V07']);

function parseArgs(argv) {
  const args = {
    fixture: path.join('evals', 'fixtures', 'pbc-contract-rules.json')
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--fixture' && argv[index + 1]) {
      args.fixture = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

function isObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function collectPermissionItems(payload) {
  const required = Array.isArray(payload.permissions) ? payload.permissions : [];
  const optional = Array.isArray(payload.optional_permissions)
    ? payload.optional_permissions.map((entry) => (isObject(entry) ? { ...entry, optional: true } : entry))
    : [];
  return [...required, ...optional];
}

function evaluatePbcRule(ruleId, payload) {
  if (!isObject(payload)) {
    return { passed: false, reason: 'payload must be an object' };
  }

  const permissionItems = collectPermissionItems(payload).filter((entry) => isObject(entry));
  if (ruleId === 'PBC-V01') {
    const invalid = permissionItems.find((permission) => {
      if (permission.optional === true) {
        return false;
      }
      return typeof permission.rationale !== 'string' || permission.rationale.trim().length < 10;
    });
    return { passed: !invalid, reason: 'each required permission must provide rationale with at least 10 chars' };
  }

  if (ruleId === 'PBC-V02') {
    const invalid = permissionItems.find((permission) => permission.optional === true && (typeof permission.degraded_behavior !== 'string' || permission.degraded_behavior.trim() === ''));
    return { passed: !invalid, reason: 'optional permissions must define degraded_behavior' };
  }

  if (ruleId === 'PBC-V04') {
    if (payload.skill_type !== 'handoff-emitter') {
      return { passed: true };
    }
    const categories = new Set(permissionItems.map((entry) => entry.category));
    return { passed: categories.has('handoff.emit'), reason: 'handoff-emitter requires handoff.emit permission' };
  }

  if (ruleId === 'PBC-V06') {
    const denied = new Set(Array.isArray(payload.denied_by_default_permissions) ? payload.denied_by_default_permissions : []);
    const conflict = permissionItems.find((permission) => denied.has(permission.category));
    return { passed: !conflict, reason: 'permission item cannot simultaneously be denied_by_default' };
  }

  if (ADVISORY_RULES.has(ruleId)) {
    return { passed: true, advisory: `Rule ${ruleId} is advisory in this slice and not enforced as blocking.` };
  }

  return { passed: false, reason: `unsupported ruleId ${ruleId}` };
}

function evaluateCase(caseEntry) {
  const issues = [];
  const advisories = [];

  if (!isObject(caseEntry)) {
    return { passed: false, issues: ['Case entry must be an object.'], advisories };
  }
  if (typeof caseEntry.id !== 'string' || caseEntry.id.trim() === '') {
    issues.push('Case id must be a non-empty string.');
  }
  if (typeof caseEntry.ruleId !== 'string' || caseEntry.ruleId.trim() === '') {
    issues.push(`Case ${caseEntry.id || '<missing-id>'} must declare ruleId.`);
  }
  if (!isObject(caseEntry.payload)) {
    issues.push(`Case ${caseEntry.id || '<missing-id>'} payload must be an object.`);
  }
  if (typeof caseEntry.expectedPass !== 'boolean') {
    issues.push(`Case ${caseEntry.id || '<missing-id>'} expectedPass must be boolean.`);
  }
  if (issues.length > 0) {
    return { passed: false, issues, advisories };
  }

  const evaluation = evaluatePbcRule(caseEntry.ruleId, caseEntry.payload);
  if (evaluation.advisory) {
    advisories.push(`Case ${caseEntry.id}: ${evaluation.advisory}`);
  }
  if (ADVISORY_RULES.has(caseEntry.ruleId)) {
    return { passed: true, issues: [], advisories };
  }

  if (evaluation.passed !== caseEntry.expectedPass) {
    issues.push(
      `Case ${caseEntry.id} expected ${caseEntry.expectedPass ? 'pass' : 'fail'} but observed ${evaluation.passed ? 'pass' : 'fail'}${evaluation.reason ? ` (${evaluation.reason})` : ''}.`
    );
  }

  return {
    passed: issues.length === 0,
    issues,
    advisories
  };
}

function evaluatePbcContractFixture(fixture) {
  const issues = [];
  const advisories = [];
  const cases = Array.isArray(fixture?.cases) ? fixture.cases : [];

  if (!isObject(fixture)) {
    return {
      passed: false,
      issues: ['Fixture must be an object.'],
      advisories,
      casesChecked: 0,
      caseResults: []
    };
  }
  if (fixture.kind !== 'pbc') {
    issues.push(`Fixture kind must be pbc, found ${fixture.kind || '<missing>'}.`);
  }
  if (cases.length === 0) {
    issues.push('Fixture must include at least one case.');
  }

  const seen = new Set();
  const caseResults = [];
  for (const caseEntry of cases) {
    const caseId = caseEntry?.id || '<missing-id>';
    const caseResult = evaluateCase(caseEntry);
    if (seen.has(caseId)) {
      caseResult.passed = false;
      caseResult.issues.push(`Duplicate case id ${caseId}.`);
    }
    seen.add(caseId);
    caseResults.push({ id: caseId, passed: caseResult.passed, issues: caseResult.issues });
    advisories.push(...caseResult.advisories);
  }

  for (const caseResult of caseResults) {
    if (!caseResult.passed) {
      issues.push(...caseResult.issues);
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    advisories,
    casesChecked: caseResults.length,
    caseResults
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const fixturePath = path.resolve(repoRoot(), args.fixture);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const result = evaluatePbcContractFixture(fixture);
    console.log(JSON.stringify({ fixturePath: fixturePath.replace(/\\/g, '/'), ...result }, null, 2));
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

export { evaluatePbcContractFixture };
