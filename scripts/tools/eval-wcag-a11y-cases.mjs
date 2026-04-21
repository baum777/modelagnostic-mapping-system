#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './_shared.mjs';
import { runAxeAccessibilityAudit } from './run-axe-accessibility-audit.mjs';
import { runLighthousePageAudit } from './run-lighthouse-page-audit.mjs';
import { lintWcagStructure } from './lint-wcag-structure.mjs';

function parseArgs(argv) {
  const args = {
    fixture: path.join('evals', 'fixtures', 'wcag-a11y-cases.json')
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

  if (fixture.kind !== 'wcag-a11y') {
    issues.push(`Fixture kind must be wcag-a11y, found ${fixture.kind || '<missing>'}.`);
  }

  if (!Array.isArray(fixture.cases) || fixture.cases.length === 0) {
    issues.push('wcag-a11y fixture must include non-empty cases array.');
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

function caseAxeReport(report, caseId) {
  return report.evidence.caseReports.find((entry) => entry.caseId === caseId) || null;
}

function caseLighthouseReport(report, caseId) {
  return report.evidence.caseReports.find((entry) => entry.caseId === caseId) || null;
}

function caseStructureFindings(report, caseId) {
  return report.findings.filter((entry) => String(entry.path || '').startsWith(caseId));
}

function hasConfirmedFinding(findings) {
  return findings.some((entry) => entry.status === 'confirmed-issue');
}

export async function evaluateWcagA11yFixture(fixture, options = {}) {
  const issues = [];
  validateFixtureShape(fixture, issues);

  if (!Array.isArray(fixture.cases) || fixture.cases.length === 0) {
    return { passed: false, issues, casesChecked: 0, caseResults: [] };
  }

  const payload = {
    source: fixture.id || 'wcag-a11y-fixture',
    axeTags: fixture.axeTags,
    cases: fixture.cases
  };

  const axeReport = await runAxeAccessibilityAudit(payload, {
    baseRoot: options.baseRoot || process.cwd(),
    mode: 'certification'
  });
  if (!Array.isArray(axeReport.evidence?.caseReports) || axeReport.evidence.caseReports.length === 0) {
    issues.push('run-axe-accessibility-audit did not produce case reports.');
  }

  const lighthouseReport = await runLighthousePageAudit(payload, {
    baseRoot: options.baseRoot || process.cwd(),
    mode: 'certification'
  });
  if (!Array.isArray(lighthouseReport.evidence?.caseReports) || lighthouseReport.evidence.caseReports.length === 0) {
    issues.push('run-lighthouse-page-audit did not produce case reports.');
  }

  const structureReport = await lintWcagStructure(payload, {
    baseRoot: options.baseRoot || process.cwd(),
    mode: 'certification'
  });
  if (!Array.isArray(structureReport.evidence?.caseReports) || structureReport.evidence.caseReports.length === 0) {
    issues.push('lint-wcag-structure did not produce case reports.');
  }

  const caseResults = [];
  for (const caseEntry of fixture.cases) {
    const riskExpect = caseEntry.expectedAccessibilityRiskPosture || {};
    const caseIssues = [];
    const detectedViolations = [];

    const axeCase = caseAxeReport(axeReport, caseEntry.id);
    const lighthouseCase = caseLighthouseReport(lighthouseReport, caseEntry.id);
    const structureFindings = caseStructureFindings(structureReport, caseEntry.id);

    if (!axeCase) {
      caseIssues.push('Missing Axe report for case.');
    }
    if (!lighthouseCase) {
      caseIssues.push('Missing Lighthouse report for case.');
    }

    if (axeCase && Number.isFinite(riskExpect.maxAxeViolations) && axeCase.summary.violations > riskExpect.maxAxeViolations) {
      detectedViolations.push(`Axe violations ${axeCase.summary.violations} exceed maxAxeViolations ${riskExpect.maxAxeViolations}.`);
    }

    if (lighthouseCase && Number.isFinite(riskExpect.minLighthouseAccessibility)) {
      const score = lighthouseCase.categories.accessibility.score;
      if (score == null || score < riskExpect.minLighthouseAccessibility) {
        detectedViolations.push(`Lighthouse accessibility score ${score} is below minLighthouseAccessibility ${riskExpect.minLighthouseAccessibility}.`);
      }
    }

    if (riskExpect.allowStructureWarnings === false) {
      const warningLike = structureFindings.filter((entry) => entry.status === 'likely-issue' || entry.status === 'manual-review-area');
      if (warningLike.length > 0) {
        detectedViolations.push('Structure warnings/manual-review findings are not allowed for this case.');
      }
    }

    const confirmed = hasConfirmedFinding(axeReport.findings.filter((entry) => String(entry.path || '').startsWith(caseEntry.id)))
      || hasConfirmedFinding(lighthouseReport.findings.filter((entry) => String(entry.path || '').startsWith(caseEntry.id)))
      || hasConfirmedFinding(structureFindings);

    const expectedOutcome = riskExpect.expectedOutcome || (caseEntry.class === 'known-fail' ? 'fail' : (caseEntry.class === 'borderline' ? 'borderline' : 'pass'));
    if (expectedOutcome === 'pass') {
      caseIssues.push(...detectedViolations);
    }
    if (expectedOutcome === 'pass' && confirmed) {
      caseIssues.push('Expected pass but confirmed blocking accessibility finding was detected.');
    }
    if (expectedOutcome === 'fail' && detectedViolations.length === 0 && !confirmed) {
      caseIssues.push('Expected fail but no confirmed blocking accessibility finding was detected.');
    }
    if (expectedOutcome === 'borderline' && confirmed) {
      caseIssues.push('Expected borderline but confirmed blocking finding was detected.');
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
      axe: axeReport,
      lighthouse: lighthouseReport,
      structure: structureReport
    }
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const fixturePath = path.resolve(repoRoot(), args.fixture);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const result = await evaluateWcagA11yFixture(fixture, { baseRoot: repoRoot() });
    console.log(JSON.stringify({ fixturePath: fixturePath.replace(/\\/g, '/'), ...result }, null, 2));
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, tool: 'evaluate-wcag-a11y-fixture', error: error.message }, null, 2));
    process.exit(1);
  }
}
