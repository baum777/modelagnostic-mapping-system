#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './_shared.mjs';

const ADVISORY_RULES = new Set(['TSC-V04']);
const FIVE_FIELD_CRON_PATTERN = /^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/;

function parseArgs(argv) {
  const args = {
    fixture: path.join('evals', 'fixtures', 'tsc-contract-rules.json')
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

function isValidCronField(value) {
  if (value === '*' || value === '?') return true;
  if (/^\d+$/.test(value)) return true;
  if (/^\*\/\d+$/.test(value)) return true;
  if (/^\d+-\d+$/.test(value)) return true;
  if (/^\d+(,\d+)+$/.test(value)) return true;
  return false;
}

function isValidFiveFieldCron(expression) {
  if (typeof expression !== 'string') {
    return false;
  }
  const match = expression.trim().match(FIVE_FIELD_CRON_PATTERN);
  if (!match) {
    return false;
  }
  const fields = match.slice(1);
  return fields.every((field) => isValidCronField(field));
}

function hasRequiredConfigBlock(payload) {
  const triggerType = payload.trigger_type;
  if (triggerType === 'manual') {
    return true;
  }
  const byType = {
    cron: 'cron_config',
    webhook: 'webhook_config',
    'message-queue': 'queue_config',
    'file-change': 'file_change_config',
    'workflow-completion': 'workflow_completion_config',
    threshold: 'threshold_config'
  };
  const requiredBlock = byType[triggerType];
  if (!requiredBlock) {
    return false;
  }
  return isObject(payload[requiredBlock]);
}

function evaluateTscRule(ruleId, payload) {
  if (!isObject(payload)) {
    return { passed: false, reason: 'payload must be an object' };
  }

  if (ruleId === 'TSC-V01') {
    return {
      passed: hasRequiredConfigBlock(payload),
      reason: 'non-manual trigger_type requires its type-specific config block'
    };
  }

  if (ruleId === 'TSC-V02') {
    if (payload.trigger_type !== 'cron') {
      return { passed: true };
    }
    const expression = payload.cron_config?.expression;
    return {
      passed: isValidFiveFieldCron(expression),
      reason: 'cron_config.expression must be a valid 5-field cron expression'
    };
  }

  if (ruleId === 'TSC-V03') {
    if (payload.trigger_type !== 'cron') {
      return { passed: true };
    }
    const timezone = payload.cron_config?.timezone;
    if (typeof timezone !== 'string' || timezone.trim() === '') {
      return { passed: false, reason: 'cron_config.timezone is required' };
    }
    try {
      Intl.DateTimeFormat('en-US', { timeZone: timezone });
      return { passed: true };
    } catch {
      return { passed: false, reason: 'cron_config.timezone must be a valid IANA identifier' };
    }
  }

  if (ruleId === 'TSC-V07') {
    return {
      passed: Number.isInteger(payload.max_concurrent_runs) && payload.max_concurrent_runs >= 1,
      reason: 'max_concurrent_runs must be an integer >= 1'
    };
  }

  if (ruleId === 'TSC-V04') {
    if (payload.trigger_type !== 'webhook') {
      return { passed: true, advisory: 'TSC-V04 is advisory and not applicable for non-webhook triggers.' };
    }
    const deploymentProfile = payload.deployment_profile || 'development';
    const authScheme = payload.webhook_config?.auth_scheme;
    return {
      passed: !(deploymentProfile !== 'development' && authScheme === 'none'),
      advisory: 'TSC-V04 is advisory in this slice: webhook auth_scheme none outside development should be reviewed.'
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

  const evaluation = evaluateTscRule(caseEntry.ruleId, caseEntry.payload);
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

function evaluateTscContractFixture(fixture) {
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
  if (fixture.kind !== 'tsc') {
    issues.push(`Fixture kind must be tsc, found ${fixture.kind || '<missing>'}.`);
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
    const result = evaluateTscContractFixture(fixture);
    console.log(JSON.stringify({ fixturePath: fixturePath.replace(/\\/g, '/'), ...result }, null, 2));
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

export { evaluateTscContractFixture };
