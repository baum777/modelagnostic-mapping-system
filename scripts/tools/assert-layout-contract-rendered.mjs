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
  const args = {
    input: null,
    contract: null,
    snapshots: null,
    mode: 'certification',
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--input' && argv[index + 1]) {
      args.input = argv[index + 1];
      index += 1;
    } else if (value === '--contract' && argv[index + 1]) {
      args.contract = argv[index + 1];
      index += 1;
    } else if (value === '--snapshots' && argv[index + 1]) {
      args.snapshots = argv[index + 1];
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

function loadPayload(baseRoot, args) {
  if (args.input) {
    const absolutePath = path.resolve(baseRoot, args.input);
    const payload = readJsonFile(absolutePath);
    return {
      source: normalizePath(absolutePath),
      payload
    };
  }

  if (!args.contract || !args.snapshots) {
    throw new Error('Provide --input <file> or both --contract and --snapshots.');
  }

  const contractPath = path.resolve(baseRoot, args.contract);
  const snapshotsPath = path.resolve(baseRoot, args.snapshots);
  return {
    source: `${normalizePath(contractPath)} + ${normalizePath(snapshotsPath)}`,
    payload: {
      contract: readJsonFile(contractPath),
      snapshots: readJsonFile(snapshotsPath)
    }
  };
}

function extractContractMap(payload) {
  if (Array.isArray(payload.contractCases)) {
    return new Map(payload.contractCases.map((entry) => [entry.caseId, entry.contract]));
  }
  if (Array.isArray(payload.cases)) {
    const mapped = payload.cases
      .filter((entry) => entry && entry.caseId && entry.contract)
      .map((entry) => [entry.caseId, entry.contract]);
    if (mapped.length > 0) {
      return new Map(mapped);
    }
  }

  const candidate = payload.contract?.contract || payload.contract || payload.visualContract || payload;
  return new Map([['*', candidate]]);
}

function extractSnapshots(payload) {
  const candidate = payload.snapshots?.evidence?.snapshots
    || payload.snapshots?.snapshots
    || payload.evidence?.snapshots
    || payload.snapshots;

  if (!Array.isArray(candidate) || candidate.length === 0) {
    throw new Error('Payload must include snapshots or evidence.snapshots array.');
  }
  return candidate;
}

function deriveObservedPosture(caseSnapshots) {
  const maxOverflow = Math.max(...caseSnapshots.map((entry) => entry.metrics.overflowCount || 0));
  const avgParagraphWords = Number((caseSnapshots.reduce((sum, entry) => sum + (entry.metrics.averageParagraphWords || 0), 0) / caseSnapshots.length).toFixed(2));
  const maxHeadingCount = Math.max(...caseSnapshots.map((entry) => entry.metrics.headingCount || 0));
  const minMainLandmarks = Math.min(...caseSnapshots.map((entry) => entry.metrics.mainLandmarkCount || 0));

  const densityLevel = maxOverflow > 0 || avgParagraphWords > 40
    ? 'compact'
    : avgParagraphWords < 20
      ? 'spacious'
      : 'balanced';

  const hierarchyIntensity = maxHeadingCount >= 8
    ? 'high'
    : maxHeadingCount >= 4
      ? 'medium'
      : 'low';

  return {
    densityLevel,
    hierarchyIntensity,
    hasMainLandmarkAcrossBreakpoints: minMainLandmarks > 0,
    maxOverflow,
    avgParagraphWords,
    maxHeadingCount
  };
}

function evaluateField(caseId, key, expected, observed) {
  if (expected == null) {
    return {
      caseId,
      key,
      expected: null,
      observed: null,
      status: 'not_assessed',
      findingStatus: 'not-assessed',
      rationale: 'No expected value provided for this assertion key.'
    };
  }

  if (key === 'proportionRule' || key === 'trustUrgencyEmphasis' || key === 'motionPosture' || key === 'colorEnergy') {
    return {
      caseId,
      key,
      expected,
      observed: null,
      status: 'not_assessed',
      findingStatus: 'not-assessed',
      rationale: 'This assertion key is not directly inferable from rendered DOM/layout metrics alone.'
    };
  }

  const actual = observed[key];
  const pass = actual === expected;
  return {
    caseId,
    key,
    expected,
    observed: actual,
    status: pass ? 'pass' : 'fail',
    findingStatus: pass ? 'not-assessed' : classifyIssueStatus({ severity: 'warning', confidence: 'high' }),
    rationale: pass
      ? 'Observed rendered posture matches expected contract value.'
      : 'Observed rendered posture diverges from expected contract value.'
  };
}

export function assertLayoutContractRendered(payload, options = {}) {
  const mode = ensureMode(options.mode || payload.mode || 'certification');
  const snapshots = extractSnapshots(payload);
  const contractMap = extractContractMap(payload);

  const byCase = new Map();
  for (const snapshot of snapshots) {
    if (!byCase.has(snapshot.caseId)) {
      byCase.set(snapshot.caseId, []);
    }
    byCase.get(snapshot.caseId).push(snapshot);
  }

  const assertions = [];
  const findings = [];

  for (const [caseId, caseSnapshots] of byCase.entries()) {
    const contract = contractMap.get(caseId) || contractMap.get('*') || {};
    const observed = deriveObservedPosture(caseSnapshots);

    for (const key of ['densityLevel', 'hierarchyIntensity', 'proportionRule', 'trustUrgencyEmphasis', 'motionPosture', 'colorEnergy']) {
      const assertion = evaluateField(caseId, key, contract[key], observed);
      assertions.push(assertion);
      if (assertion.status === 'fail') {
        findings.push({
          status: assertion.findingStatus,
          severity: assertion.findingStatus === 'confirmed-issue' ? 'error' : 'warning',
          code: `contract-render.${key}.mismatch`,
          message: `Case ${caseId} expected ${key}=${assertion.expected} but observed ${assertion.observed}.`,
          path: `${caseId}.${key}`,
          suggestedFix: 'Adjust implementation or semantic contract so rendered posture and declared contract align.'
        });
      }
    }

    if (!observed.hasMainLandmarkAcrossBreakpoints) {
      findings.push({
        status: classifyIssueStatus({ severity: 'error', confidence: 'high' }),
        severity: 'error',
        code: 'contract-render.missing_main_landmark',
        message: `Case ${caseId} loses main landmark at one or more breakpoints.`,
        path: `${caseId}.mainLandmark`,
        suggestedFix: 'Preserve a main landmark across all certified breakpoints.'
      });
    }
  }

  const ok = findings.every((entry) => entry.status !== 'confirmed-issue');
  return buildEnvelope({
    ok,
    tool: 'assert-layout-contract-rendered',
    mode,
    input: {
      source: payload.source || null,
      caseCount: byCase.size
    },
    runtime: {
      deterministicInput: true
    },
    evidence: {
      assertions
    },
    findings,
    nonClaims: [
      'Contract-to-render assertions are bounded to measurable DOM/layout posture and do not replace broader UX review.',
      'Not-assessed assertions indicate fields that are not inferable from rendered metrics alone.'
    ]
  });
}

function printHuman(report) {
  console.log('# Assert Layout Contract Rendered');
  console.log('');
  console.log(`- ok: ${report.ok}`);
  console.log(`- assertions: ${report.evidence.assertions.length}`);
  console.log(`- findings: ${report.findings.length}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const loaded = loadPayload(process.cwd(), args);
    const report = assertLayoutContractRendered({ ...loaded.payload, source: loaded.source }, { mode: args.mode });
    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printHuman(report);
    }
    process.exit(report.ok ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, tool: 'assert-layout-contract-rendered', error: error.message }, null, 2));
    process.exit(1);
  }
}