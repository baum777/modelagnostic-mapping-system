#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './_shared.mjs';

const OBS_ERROR_CLASS = new Set([
  'validation',
  'permission',
  'memory',
  'resource',
  'provider',
  'transport',
  'unknown'
]);

const ATTRIBUTE_KEY_PATTERN = /^[a-z0-9_-]+\.[a-z0-9_.:-]+$/;
const ADVISORY_RULES = new Set(['OBS-V05']);

function parseArgs(argv) {
  const args = {
    fixture: path.join('evals', 'fixtures', 'obs-contract-rules.json')
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

function evaluateObsRule(ruleId, payload) {
  if (!isObject(payload)) {
    return { passed: false, reason: 'payload must be an object' };
  }

  if (ruleId === 'OBS-V01') {
    if (!['skill.completed', 'skill.blocked'].includes(payload.event_name)) {
      return { passed: true };
    }
    const duration = payload.metrics?.duration_ms;
    return { passed: Number.isInteger(duration) && duration >= 0, reason: 'skill.completed/skill.blocked require metrics.duration_ms' };
  }

  if (ruleId === 'OBS-V02') {
    if (payload.event_name !== 'skill.error') {
      return { passed: true };
    }
    return { passed: isObject(payload.error), reason: 'skill.error requires non-null error object' };
  }

  if (ruleId === 'OBS-V03') {
    if (payload.event_name !== 'skill.error') {
      return { passed: true };
    }
    const errorClass = payload.error?.error_class;
    return { passed: typeof errorClass === 'string' && OBS_ERROR_CLASS.has(errorClass), reason: 'error.error_class must be a supported enum value' };
  }

  if (ruleId === 'OBS-V04') {
    if (!('attributes' in payload)) {
      return { passed: true };
    }
    if (!isObject(payload.attributes)) {
      return { passed: false, reason: 'attributes must be an object' };
    }
    const invalidKey = Object.keys(payload.attributes).find((key) => !ATTRIBUTE_KEY_PATTERN.test(key));
    return { passed: !invalidKey, reason: 'attributes keys must follow {skill-id}.{attribute} namespace' };
  }

  if (ruleId === 'OBS-V06') {
    if (payload.event_name !== 'resource.budget_exceeded') {
      return { passed: true };
    }
    return { passed: isObject(payload.resource_usage), reason: 'resource.budget_exceeded requires resource_usage' };
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

  const evaluation = evaluateObsRule(caseEntry.ruleId, caseEntry.payload);
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

function evaluateObsContractFixture(fixture) {
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
  if (fixture.kind !== 'obs') {
    issues.push(`Fixture kind must be obs, found ${fixture.kind || '<missing>'}.`);
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
    const result = evaluateObsContractFixture(fixture);
    console.log(JSON.stringify({ fixturePath: fixturePath.replace(/\\/g, '/'), ...result }, null, 2));
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

export { evaluateObsContractFixture };
