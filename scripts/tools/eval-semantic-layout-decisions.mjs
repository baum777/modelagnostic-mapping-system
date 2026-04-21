#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './_shared.mjs';
import { analyzeContentSemanticsForDesign } from './analyze-content-semantics-for-design.mjs';
import { generateVisualDirectionContractFromProfile } from './generate-visual-direction-contract.mjs';

const ALLOWED_PROPORTION_RULES = new Set(['none', 'golden-ratio-macro-only']);

function parseArgs(argv) {
  const args = {
    fixture: path.join('evals', 'fixtures', 'semantic-layout-decisions.json')
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

function stylizationScore(contract) {
  let score = 0;
  if (contract.visualPosture === 'expressive-conversion') score += 1;
  if (contract.colorEnergy === 'vivid') score += 1;
  if (contract.motionPosture === 'assertive') score += 1;
  return score;
}

function compareExpected(caseId, expected, profile, contract, issues) {
  const checks = [
    ['contentType', profile.contentType],
    ['tonePosture', profile.tonePosture],
    ['readingDensity', profile.readingDensity],
    ['hierarchyStrength', profile.hierarchyStrength],
    ['visualPosture', contract.visualPosture],
    ['densityLevel', contract.densityLevel],
    ['hierarchyIntensity', contract.hierarchyIntensity],
    ['colorEnergy', contract.colorEnergy],
    ['motionPosture', contract.motionPosture],
    ['trustUrgencyEmphasis', contract.trustUrgencyEmphasis],
    ['proportionRule', contract.proportionRule]
  ];

  for (const [key, actual] of checks) {
    if (key in expected && expected[key] !== actual) {
      issues.push(`Case ${caseId} expected ${key}=${expected[key]} but observed ${actual}.`);
    }
  }

  if ('maxStylizationScore' in expected) {
    const actualScore = stylizationScore(contract);
    if (actualScore > expected.maxStylizationScore) {
      issues.push(`Case ${caseId} stylization score ${actualScore} exceeds maxStylizationScore ${expected.maxStylizationScore}.`);
    }
  }

  if (!ALLOWED_PROPORTION_RULES.has(contract.proportionRule)) {
    issues.push(`Case ${caseId} produced unsupported proportionRule ${contract.proportionRule}.`);
  }
}

function runCase(caseEntry) {
  const issues = [];
  if (!caseEntry || typeof caseEntry !== 'object') {
    return { passed: false, issues: ['Case entry must be an object.'] };
  }

  if (typeof caseEntry.id !== 'string' || caseEntry.id.trim() === '') {
    issues.push('Case id must be a non-empty string.');
  }
  if (typeof caseEntry.input?.content !== 'string' || caseEntry.input.content.trim() === '') {
    issues.push(`Case ${caseEntry.id || '<missing-id>'} input.content must be non-empty.`);
  }
  if (!caseEntry.expected || typeof caseEntry.expected !== 'object') {
    issues.push(`Case ${caseEntry.id || '<missing-id>'} expected block must be an object.`);
  }
  if (issues.length > 0) {
    return { passed: false, issues };
  }

  const payload = {
    source: `fixture:${caseEntry.id}`,
    content: caseEntry.input.content,
    contentTypeHint: caseEntry.input.contentTypeHint || null,
    audienceHint: Array.isArray(caseEntry.input.audienceHint) ? caseEntry.input.audienceHint : []
  };

  const firstAnalysis = analyzeContentSemanticsForDesign(payload);
  const firstContract = generateVisualDirectionContractFromProfile(firstAnalysis).contract;
  const secondAnalysis = analyzeContentSemanticsForDesign(payload);
  const secondContract = generateVisualDirectionContractFromProfile(secondAnalysis).contract;

  if (JSON.stringify(firstAnalysis.profile) !== JSON.stringify(secondAnalysis.profile)) {
    issues.push(`Case ${caseEntry.id} profile output is not deterministic across repeated runs.`);
  }
  if (JSON.stringify(firstContract) !== JSON.stringify(secondContract)) {
    issues.push(`Case ${caseEntry.id} contract output is not deterministic across repeated runs.`);
  }

  compareExpected(caseEntry.id, caseEntry.expected, firstAnalysis.profile, firstContract, issues);

  return {
    passed: issues.length === 0,
    issues,
    observed: {
      profile: firstAnalysis.profile,
      contract: firstContract,
      stylizationScore: stylizationScore(firstContract)
    }
  };
}

function evaluateSemanticLayoutDecisionsFixture(fixture) {
  const issues = [];
  const cases = Array.isArray(fixture?.cases) ? fixture.cases : [];
  const results = [];

  if (!fixture || typeof fixture !== 'object') {
    return {
      passed: false,
      issues: ['Fixture must be an object.'],
      casesChecked: 0,
      caseResults: []
    };
  }

  if (fixture.kind !== 'semantic-layout') {
    issues.push(`Fixture kind must be semantic-layout, found ${fixture.kind || '<missing>'}.`);
  }

  if (cases.length === 0) {
    issues.push('Fixture must include at least one case.');
  }

  const seenIds = new Set();
  for (const caseEntry of cases) {
    const caseResult = runCase(caseEntry);
    if (typeof caseEntry?.id === 'string') {
      if (seenIds.has(caseEntry.id)) {
        caseResult.passed = false;
        caseResult.issues.push(`Duplicate case id ${caseEntry.id}.`);
      }
      seenIds.add(caseEntry.id);
    }
    results.push({
      id: caseEntry?.id || '<missing-id>',
      passed: caseResult.passed,
      issues: caseResult.issues,
      observed: caseResult.observed
    });
  }

  const failingCases = results.filter((entry) => !entry.passed);
  for (const failure of failingCases) {
    issues.push(...failure.issues);
  }

  return {
    passed: issues.length === 0,
    issues,
    casesChecked: results.length,
    caseResults: results
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const fixturePath = path.resolve(repoRoot(), args.fixture);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const result = evaluateSemanticLayoutDecisionsFixture(fixture);
    console.log(JSON.stringify({ fixturePath: fixturePath.replace(/\\/g, '/'), ...result }, null, 2));
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

export { evaluateSemanticLayoutDecisionsFixture };