#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './_shared.mjs';
import { renderPageSnapshots } from './render-page-snapshots.mjs';
import { compareRenderBreakpoints } from './compare-render-breakpoints.mjs';
import { assertLayoutContractRendered } from './assert-layout-contract-rendered.mjs';

function parseArgs(argv) {
  const args = {
    fixture: path.join('evals', 'fixtures', 'render-layout-cases.json')
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

function validateFixtureShape(fixture, issues) {
  const requiredClasses = new Set(['clean-pass', 'known-fail', 'borderline', 'responsive-stress', 'semantic-vs-render-contradiction']);
  const classCounts = new Map();

  if (fixture.kind !== 'render-layout') {
    issues.push(`Fixture kind must be render-layout, found ${fixture.kind || '<missing>'}.`);
  }

  if (!Array.isArray(fixture.cases) || fixture.cases.length === 0) {
    issues.push('render-layout fixture must include non-empty cases array.');
    return;
  }

  for (const caseEntry of fixture.cases) {
    const className = caseEntry.class;
    classCounts.set(className, (classCounts.get(className) || 0) + 1);
    for (const requiredField of ['intendedSemanticPosture', 'expectedRenderPosture', 'expectedAccessibilityRiskPosture', 'permittedAmbiguity', 'nonClaims']) {
      if (!(requiredField in caseEntry)) {
        issues.push(`Case ${caseEntry.id || '<missing-id>'} missing required fixture field ${requiredField}.`);
      }
    }
  }

  for (const className of requiredClasses) {
    if ((classCounts.get(className) || 0) < 1) {
      issues.push(`Fixture must include at least one ${className} case.`);
    }
  }
}

function caseSnapshots(report, caseId) {
  return report.evidence.snapshots.filter((entry) => entry.caseId === caseId);
}

function hasConfirmedFinding(findings, caseId) {
  return findings.some((entry) => entry.path && String(entry.path).startsWith(caseId) && entry.status === 'confirmed-issue');
}

export async function evaluateRenderLayoutFixture(fixture, options = {}) {
  const issues = [];
  validateFixtureShape(fixture, issues);

  if (!Array.isArray(fixture.cases) || fixture.cases.length === 0) {
    return { passed: false, issues, casesChecked: 0, caseResults: [] };
  }

  const payload = {
    source: fixture.id || 'render-layout-fixture',
    breakpoints: fixture.breakpoints,
    repeat: fixture.repeatCount || 2,
    cases: fixture.cases
  };

  const snapshotsReport = await renderPageSnapshots(payload, {
    baseRoot: options.baseRoot || process.cwd(),
    mode: 'certification',
    outputDir: fixture.outputDir || path.join('artifacts', 'render-snapshots')
  });

  if (!Array.isArray(snapshotsReport.evidence?.snapshots) || snapshotsReport.evidence.snapshots.length === 0) {
    issues.push('render-page-snapshots did not produce snapshot evidence.');
  }

  const breakpointReport = compareRenderBreakpoints({
    source: fixture.id || 'render-layout-fixture',
    snapshots: snapshotsReport.evidence.snapshots
  }, { mode: 'certification' });

  const contractCases = fixture.cases
    .filter((entry) => entry.expectedRenderPosture?.contract)
    .map((entry) => ({ caseId: entry.id, contract: entry.expectedRenderPosture.contract }));

  const contractReport = assertLayoutContractRendered({
    source: fixture.id || 'render-layout-fixture',
    snapshots: snapshotsReport.evidence.snapshots,
    contractCases
  }, { mode: 'certification' });

  const caseResults = [];
  for (const caseEntry of fixture.cases) {
    const snapshots = caseSnapshots(snapshotsReport, caseEntry.id);
    const renderExpect = caseEntry.expectedRenderPosture || {};

    const caseIssues = [];
    const detectedViolations = [];
    if (snapshots.length === 0) {
      caseIssues.push('No snapshots produced for case.');
    }

    if (renderExpect.requireReproducible !== false && snapshots.some((entry) => !entry.reproducible)) {
      detectedViolations.push('Snapshots are not reproducible across repeated runs.');
    }

    if (Number.isFinite(renderExpect.maxOverflowCount)) {
      const maxObservedOverflow = Math.max(...snapshots.map((entry) => entry.metrics.overflowCount || 0), 0);
      if (maxObservedOverflow > renderExpect.maxOverflowCount) {
        detectedViolations.push(`Observed overflow ${maxObservedOverflow} exceeds maxOverflowCount ${renderExpect.maxOverflowCount}.`);
      }
    }

    if (renderExpect.requireMainLandmark === true) {
      const minMain = Math.min(...snapshots.map((entry) => entry.metrics.mainLandmarkCount || 0), Infinity);
      if (!(minMain > 0)) {
        detectedViolations.push('Main landmark is missing in at least one breakpoint snapshot.');
      }
    }

    const confirmedInRender = hasConfirmedFinding(snapshotsReport.findings, caseEntry.id)
      || hasConfirmedFinding(breakpointReport.findings, caseEntry.id)
      || hasConfirmedFinding(contractReport.findings, caseEntry.id);

    const expectedOutcome = renderExpect.expectedOutcome || (caseEntry.class === 'known-fail' || caseEntry.class === 'semantic-vs-render-contradiction' ? 'fail' : (caseEntry.class === 'borderline' ? 'borderline' : 'pass'));
    if (expectedOutcome === 'pass') {
      caseIssues.push(...detectedViolations);
    }
    if (expectedOutcome === 'pass' && confirmedInRender) {
      caseIssues.push('Expected pass but confirmed blocking findings were detected.');
    }
    if (expectedOutcome === 'fail' && detectedViolations.length === 0 && !confirmedInRender) {
      caseIssues.push('Expected fail but no confirmed blocking finding was detected.');
    }
    if (expectedOutcome === 'borderline' && confirmedInRender) {
      caseIssues.push('Expected borderline but confirmed blocking findings were detected.');
    }

    caseResults.push({
      id: caseEntry.id,
      class: caseEntry.class,
      passed: caseIssues.length === 0,
      issues: caseIssues
    });
  }

  const failingCases = caseResults.filter((entry) => !entry.passed);
  for (const failing of failingCases) {
    for (const issue of failing.issues) {
      issues.push(`Case ${failing.id}: ${issue}`);
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    casesChecked: caseResults.length,
    caseResults,
    evidence: {
      snapshots: snapshotsReport,
      breakpoints: breakpointReport,
      contract: contractReport
    }
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const fixturePath = path.resolve(repoRoot(), args.fixture);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const result = await evaluateRenderLayoutFixture(fixture, { baseRoot: repoRoot() });
    console.log(JSON.stringify({ fixturePath: fixturePath.replace(/\\/g, '/'), ...result }, null, 2));
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, tool: 'evaluate-render-layout-fixture', error: error.message }, null, 2));
    process.exit(1);
  }
}
