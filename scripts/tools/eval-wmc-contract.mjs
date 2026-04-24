#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './_shared.mjs';

const KEY_PATTERN = /^[a-z0-9][a-z0-9_.:-]*$/;

function parseArgs(argv) {
  const args = {
    fixture: path.join('evals', 'fixtures', 'wmc-contract-rules.json')
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

function isJsonValue(value) {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.every((entry) => isJsonValue(entry));
  if (isObject(value)) {
    return Object.values(value).every((entry) => isJsonValue(entry));
  }
  return false;
}

function matchesValueType(valueType, value) {
  if (valueType === 'string') return typeof value === 'string';
  if (valueType === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (valueType === 'boolean') return typeof value === 'boolean';
  if (valueType === 'object') return isObject(value);
  if (valueType === 'array') return Array.isArray(value);
  if (valueType === 'json') return isJsonValue(value);
  if (valueType === 'reference') return typeof value === 'string' && value.trim().length > 0;
  if (valueType === 'binary-hash') return typeof value === 'string' && /^[A-Fa-f0-9]{16,}$/.test(value);
  return false;
}

function evaluateWmcRule(ruleId, payload) {
  if (!isObject(payload)) {
    return { passed: false, reason: 'payload must be an object' };
  }

  if (ruleId === 'WMC-V01') {
    if (!['persistent', 'shared'].includes(payload.scope)) {
      return { passed: true };
    }
    return { passed: Number.isInteger(payload.ttl_seconds) && payload.ttl_seconds > 0, reason: 'persistent/shared require ttl_seconds' };
  }

  if (ruleId === 'WMC-V02') {
    if (payload.provenance?.claim_status !== 'observed') {
      return { passed: true };
    }
    return {
      passed: typeof payload.provenance?.verification_reference === 'string' && payload.provenance.verification_reference.trim().length > 0,
      reason: 'observed entries require provenance.verification_reference'
    };
  }

  if (ruleId === 'WMC-V03') {
    if (payload.provenance?.claim_status !== 'inferred') {
      return { passed: true };
    }
    return {
      passed: Array.isArray(payload.provenance?.derived_from) && payload.provenance.derived_from.length > 0,
      reason: 'inferred entries require non-empty provenance.derived_from'
    };
  }

  if (ruleId === 'WMC-V05') {
    const key = payload.key;
    return {
      passed: typeof key === 'string' && key.length <= 256 && KEY_PATTERN.test(key),
      reason: 'key must match pattern and be <= 256 chars'
    };
  }

  if (ruleId === 'WMC-V06') {
    if (payload.scope !== 'shared') {
      return { passed: true };
    }
    return { passed: isObject(payload.read_access), reason: 'shared entries require read_access' };
  }

  if (ruleId === 'WMC-V07') {
    return { passed: matchesValueType(payload.value_type, payload.value), reason: 'value must match declared value_type' };
  }

  return { passed: false, reason: `unsupported ruleId ${ruleId}` };
}

function evaluateCase(caseEntry) {
  const issues = [];

  if (!isObject(caseEntry)) {
    return { passed: false, issues: ['Case entry must be an object.'] };
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
    return { passed: false, issues };
  }

  const evaluation = evaluateWmcRule(caseEntry.ruleId, caseEntry.payload);
  if (evaluation.passed !== caseEntry.expectedPass) {
    issues.push(
      `Case ${caseEntry.id} expected ${caseEntry.expectedPass ? 'pass' : 'fail'} but observed ${evaluation.passed ? 'pass' : 'fail'}${evaluation.reason ? ` (${evaluation.reason})` : ''}.`
    );
  }

  return {
    passed: issues.length === 0,
    issues
  };
}

function evaluateWmcContractFixture(fixture) {
  const issues = [];
  const cases = Array.isArray(fixture?.cases) ? fixture.cases : [];

  if (!isObject(fixture)) {
    return {
      passed: false,
      issues: ['Fixture must be an object.'],
      casesChecked: 0,
      caseResults: []
    };
  }
  if (fixture.kind !== 'wmc') {
    issues.push(`Fixture kind must be wmc, found ${fixture.kind || '<missing>'}.`);
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
  }

  for (const caseResult of caseResults) {
    if (!caseResult.passed) {
      issues.push(...caseResult.issues);
    }
  }

  return {
    passed: issues.length === 0,
    issues,
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
    const result = evaluateWmcContractFixture(fixture);
    console.log(JSON.stringify({ fixturePath: fixturePath.replace(/\\/g, '/'), ...result }, null, 2));
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

export { evaluateWmcContractFixture };
