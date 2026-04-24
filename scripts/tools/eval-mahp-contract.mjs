#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './_shared.mjs';

function parseArgs(argv) {
  const args = {
    fixture: path.join('evals', 'fixtures', 'mahp-contract-rules.json')
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

function evaluateMahpRule(ruleId, payload) {
  if (!isObject(payload)) {
    return { passed: false, reason: 'payload must be an object' };
  }

  if (ruleId === 'MAHP-V01') {
    return {
      passed: Array.isArray(payload.acceptance_criteria) && payload.acceptance_criteria.length > 0,
      reason: 'acceptance_criteria must be non-empty'
    };
  }

  if (ruleId === 'MAHP-V02') {
    const steps = Array.isArray(payload.execution_context?.applied_steps) ? payload.execution_context.applied_steps : [];
    const invalid = steps.find(
      (step) => isObject(step) && step.execution_status === 'verified' && (typeof step.verification_reference !== 'string' || step.verification_reference.trim() === '')
    );
    return {
      passed: !invalid,
      reason: 'verified applied_steps require verification_reference'
    };
  }

  if (ruleId === 'MAHP-V03') {
    const chain = Array.isArray(payload.provenance_chain) ? payload.provenance_chain : [];
    const hasOrigin = chain.some((entry) => isObject(entry) && entry.relationship === 'origin');
    return {
      passed: chain.length > 0 && hasOrigin,
      reason: 'provenance_chain must be non-empty and include origin'
    };
  }

  if (ruleId === 'MAHP-V04') {
    if (!['fan-out', 'fan-in'].includes(payload.composition_pattern)) {
      return { passed: true };
    }
    return {
      passed: typeof payload.fan_out_group_id === 'string' && payload.fan_out_group_id.trim().length > 0,
      reason: 'fan_out_group_id required for fan-out/fan-in'
    };
  }

  if (ruleId === 'MAHP-V07') {
    return {
      passed: ['applied', 'verified'].includes(payload.emitter?.execution_status),
      reason: 'emitter.execution_status must be applied or verified'
    };
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

  const evaluation = evaluateMahpRule(caseEntry.ruleId, caseEntry.payload);
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

function evaluateMahpContractFixture(fixture) {
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
  if (fixture.kind !== 'mahp') {
    issues.push(`Fixture kind must be mahp, found ${fixture.kind || '<missing>'}.`);
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
    const result = evaluateMahpContractFixture(fixture);
    console.log(JSON.stringify({ fixturePath: fixturePath.replace(/\\/g, '/'), ...result }, null, 2));
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

export { evaluateMahpContractFixture };
