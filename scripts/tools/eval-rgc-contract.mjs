#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './_shared.mjs';

const ADVISORY_RULES = new Set(['RGC-V04', 'RGC-V06']);
const PROFILE_TOKEN_CEILINGS = {
  minimal: 2000,
  standard: 16000,
  intensive: 128000
};

function parseArgs(argv) {
  const args = {
    fixture: path.join('evals', 'fixtures', 'rgc-contract-rules.json')
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

function evaluateRgcRule(ruleId, payload) {
  if (!isObject(payload)) {
    return { passed: false, reason: 'payload must be an object' };
  }

  const declaration = isObject(payload.skill_resource_declaration) ? payload.skill_resource_declaration : {};
  const resource = isObject(declaration.resource) ? declaration.resource : {};
  const fallbackSkillId = resource.fallback_skill_id;
  const skillCatalog = isObject(payload.skill_catalog) ? payload.skill_catalog : {};
  const fallbackDeclaration = typeof fallbackSkillId === 'string' ? skillCatalog[fallbackSkillId] : null;
  const fallbackResource = isObject(fallbackDeclaration?.resource) ? fallbackDeclaration.resource : {};
  const budgetCap = isObject(payload.workflow_budget_cap) ? payload.workflow_budget_cap : {};

  if (ruleId === 'RGC-V01') {
    if (typeof fallbackSkillId !== 'string' || fallbackSkillId.trim() === '') {
      return { passed: true };
    }
    return { passed: isObject(fallbackDeclaration), reason: 'fallback_skill_id must reference an existing skill declaration' };
  }

  if (ruleId === 'RGC-V02') {
    if (typeof fallbackSkillId !== 'string' || fallbackSkillId.trim() === '') {
      return { passed: true };
    }
    if (!isObject(fallbackDeclaration)) {
      return { passed: true };
    }
    return { passed: fallbackResource.profile === 'minimal', reason: 'referenced fallback skill must use profile minimal' };
  }

  if (ruleId === 'RGC-V03') {
    if (typeof fallbackSkillId !== 'string' || fallbackSkillId.trim() === '') {
      return { passed: true };
    }
    if (!isObject(fallbackDeclaration)) {
      return { passed: true };
    }
    return {
      passed: !(typeof fallbackResource.fallback_skill_id === 'string' && fallbackResource.fallback_skill_id.trim() !== ''),
      reason: 'referenced fallback skill must not declare its own fallback_skill_id'
    };
  }

  if (ruleId === 'RGC-V05') {
    if (budgetCap.on_budget_exceeded !== 'fallback') {
      return { passed: true };
    }
    return {
      passed: typeof fallbackSkillId === 'string' && fallbackSkillId.trim() !== '',
      reason: 'on_budget_exceeded fallback requires skill fallback_skill_id'
    };
  }

  if (ruleId === 'RGC-V06') {
    if (resource.profile === 'custom') {
      return { passed: true, advisory: 'RGC-V06 is advisory and profile custom is ceiling-exempt.' };
    }
    const ceiling = PROFILE_TOKEN_CEILINGS[resource.profile];
    if (!Number.isInteger(ceiling) || !Number.isInteger(resource.max_tokens_hint)) {
      return { passed: true, advisory: 'RGC-V06 is advisory and skipped when profile ceiling or max_tokens_hint is absent.' };
    }
    return {
      passed: resource.max_tokens_hint <= ceiling,
      advisory: `RGC-V06 is advisory in this slice: profile ${resource.profile} should not exceed ${ceiling} max_tokens_hint.`
    };
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

  const evaluation = evaluateRgcRule(caseEntry.ruleId, caseEntry.payload);
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

function evaluateRgcContractFixture(fixture) {
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
  if (fixture.kind !== 'rgc') {
    issues.push(`Fixture kind must be rgc, found ${fixture.kind || '<missing>'}.`);
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
    const result = evaluateRgcContractFixture(fixture);
    console.log(JSON.stringify({ fixturePath: fixturePath.replace(/\\/g, '/'), ...result }, null, 2));
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

export { evaluateRgcContractFixture };
