#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildEnvelope,
  classifyIssueStatus,
  ensureMode,
  normalizePath,
  readJsonFile
} from './_render_a11y_shared.mjs';

function parseArgs(argv) {
  const args = { input: null, mode: 'certification', json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--input' && argv[index + 1]) {
      args.input = argv[index + 1];
      index += 1;
    } else if (value === '--mode' && argv[index + 1]) {
      args.mode = argv[index + 1];
      index += 1;
    } else if (value === '--json') {
      args.json = true;
    }
  }
  return args;
}

function loadSnapshots(baseRoot, args) {
  if (!args.input) {
    throw new Error('Missing --input <render-page-snapshots-report.json>.');
  }
  const absolutePath = path.resolve(baseRoot, args.input);
  const payload = readJsonFile(absolutePath);
  const snapshots = Array.isArray(payload.evidence?.snapshots)
    ? payload.evidence.snapshots
    : Array.isArray(payload.snapshots)
      ? payload.snapshots
      : [];
  if (snapshots.length === 0) {
    throw new Error('Input must include snapshots array or evidence.snapshots array.');
  }
  return {
    source: normalizePath(absolutePath),
    snapshots
  };
}

function comparePair(left, right) {
  const checks = [];

  const overflowRegression = (right.metrics.overflowCount || 0) > (left.metrics.overflowCount || 0);
  checks.push({
    code: 'responsive.overflow_regression',
    status: overflowRegression ? 'fail' : 'pass',
    detail: `left=${left.metrics.overflowCount}, right=${right.metrics.overflowCount}`,
    findingStatus: overflowRegression ? classifyIssueStatus({ severity: 'error', confidence: 'high' }) : 'not-assessed'
  });

  const headingCollapse = (right.metrics.headingCount || 0) < Math.max(1, Math.floor((left.metrics.headingCount || 0) * 0.5));
  checks.push({
    code: 'responsive.heading_collapse',
    status: headingCollapse ? 'fail' : 'pass',
    detail: `left=${left.metrics.headingCount}, right=${right.metrics.headingCount}`,
    findingStatus: headingCollapse ? classifyIssueStatus({ severity: 'warning', confidence: 'high' }) : 'not-assessed'
  });

  const landmarkLoss = (left.metrics.mainLandmarkCount || 0) > 0 && (right.metrics.mainLandmarkCount || 0) === 0;
  checks.push({
    code: 'responsive.landmark_loss',
    status: landmarkLoss ? 'fail' : 'pass',
    detail: `left=${left.metrics.mainLandmarkCount}, right=${right.metrics.mainLandmarkCount}`,
    findingStatus: landmarkLoss ? classifyIssueStatus({ severity: 'error', confidence: 'high' }) : 'not-assessed'
  });

  const groupingCollapse = (right.metrics.sectionLikeCount || 0) < Math.max(1, Math.floor((left.metrics.sectionLikeCount || 0) * 0.5));
  checks.push({
    code: 'responsive.grouping_collapse',
    status: groupingCollapse ? 'fail' : 'pass',
    detail: `left=${left.metrics.sectionLikeCount}, right=${right.metrics.sectionLikeCount}`,
    findingStatus: groupingCollapse ? classifyIssueStatus({ severity: 'warning', confidence: 'medium' }) : 'not-assessed'
  });

  const paragraphDensitySpike = (right.metrics.maxParagraphWords || 0) > 140;
  checks.push({
    code: 'responsive.readability_density_spike',
    status: paragraphDensitySpike ? 'manual-review' : 'pass',
    detail: `right.maxParagraphWords=${right.metrics.maxParagraphWords}`,
    findingStatus: paragraphDensitySpike ? 'manual-review-area' : 'not-assessed'
  });

  return checks;
}

export function compareRenderBreakpoints(payload, options = {}) {
  const mode = ensureMode(options.mode || payload.mode || 'certification');
  const grouped = new Map();
  for (const snapshot of payload.snapshots) {
    const key = snapshot.caseId;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(snapshot);
  }

  const breakpointComparisons = [];
  const findings = [];

  for (const [caseId, snapshots] of grouped.entries()) {
    const ordered = [...snapshots].sort((left, right) => (left.breakpoint.width || 0) - (right.breakpoint.width || 0));
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const left = ordered[index];
      const right = ordered[index + 1];
      const checks = comparePair(left, right);

      for (const check of checks) {
        if (check.findingStatus !== 'not-assessed') {
          findings.push({
            status: check.findingStatus,
            severity: check.findingStatus === 'confirmed-issue' ? 'error' : (check.findingStatus === 'likely-issue' ? 'warning' : 'info'),
            code: check.code,
            message: `${caseId} ${check.code} between ${left.breakpoint.name} and ${right.breakpoint.name}: ${check.detail}`,
            path: `${caseId}.${left.breakpoint.name}->${right.breakpoint.name}`,
            suggestedFix: 'Preserve readability, grouping, hierarchy, and overflow constraints across breakpoints.'
          });
        }
      }

      breakpointComparisons.push({
        caseId,
        from: left.breakpoint,
        to: right.breakpoint,
        checks
      });
    }
  }

  const ok = findings.every((entry) => entry.status !== 'confirmed-issue');
  return buildEnvelope({
    ok,
    tool: 'compare-render-breakpoints',
    mode,
    input: {
      source: payload.source || null,
      caseCount: grouped.size,
      comparisonCount: breakpointComparisons.length
    },
    runtime: {
      deterministicInput: true
    },
    evidence: {
      breakpointComparisons
    },
    findings,
    nonClaims: [
      'Small visual differences are non-blocking unless readability, hierarchy, grouping, or overflow constraints are violated.',
      'This comparison is metric-based and does not claim pixel-perfect screenshot equivalence.'
    ]
  });
}

function printHuman(report) {
  console.log('# Compare Render Breakpoints');
  console.log('');
  console.log(`- ok: ${report.ok}`);
  console.log(`- comparisons: ${report.evidence.breakpointComparisons.length}`);
  console.log(`- findings: ${report.findings.length}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const payload = loadSnapshots(process.cwd(), args);
    const report = compareRenderBreakpoints(payload, { mode: args.mode });
    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printHuman(report);
    }
    process.exit(report.ok ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, tool: 'compare-render-breakpoints', error: error.message }, null, 2));
    process.exit(1);
  }
}