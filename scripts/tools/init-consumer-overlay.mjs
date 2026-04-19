#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readJson, repoRoot } from './_shared.mjs';

const adoptedSkills = [
  'planning-slice-builder',
  'implementation-contract-extractor',
  'test-matrix-builder',
  'post-implementation-review-writer',
  'patch-strategy-designer',
  'failure-mode-enumerator',
  'release-narrative-builder'
];

const deferredSkills = [
  'runtime-policy-auditor',
  'paper-to-live-readiness-reviewer',
  'journal-to-learning-extractor'
];
const repoIntakeSkill = 'repo-intake-sot-mapper';
const repoIntakeContract = '.codex/repo-intake-inputs.json';

function parseArgs(argv) {
  const args = { consumer: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--consumer' && argv[index + 1]) {
      args.consumer = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

function normalize(filePath) {
  return path.resolve(filePath).replace(/\\/g, '/');
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content}\n`, 'utf8');
}

function fingerprint(root) {
  const output = execFileSync('node', ['scripts/tools/calculate-package-fingerprint.mjs'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return JSON.parse(output);
}

function buildConsumerDoc(version, packageFingerprint) {
  return [
    '# Model-Agnostic Workflow System Consumer Overlay',
    '',
    'This repository consumes the standalone shared-core model-agnostic-workflow-system package from:',
    '',
    '`the standalone model-agnostic-workflow-system repository`',
    '',
    '## Linked Version',
    '',
    `- shared-core version: \`${version}\``,
    `- package fingerprint: \`${packageFingerprint}\``,
    '- linkage mode: versioned local repository reference',
    '',
    '## What Is Adopted',
    '',
    `- ${repoIntakeSkill} with a consumer-local input contract`,
    '- planning slice building',
    '- implementation contract extraction',
    '- test matrix building',
    '- post-implementation review writing',
    '- patch strategy selection',
    '- failure mode enumeration',
    '- release narrative building',
    '',
    '## What Stays Local',
    '',
    '- `AGENTS.md`',
    `- ${repoIntakeContract}`,
    '- local governance artifacts',
    '- repo-specific canonical docs',
    '- approval and scorecard rules',
    '',
    '## Operator Rule',
    '',
    'Read the consumer manifest before using shared-core assets.',
    'Do not edit the standalone shared-core source from this repository.',
    `For ${repoIntakeSkill}, keep ${repoIntakeContract} current and validated.`,
    '',
    '## Validation',
    '',
    'Run the consumer validator after changing overlay files or changing the shared-core source reference.'
  ].join('\n');
}

function buildCanonicalSourcesDoc() {
  return [
    '# Repo-Specific Canonical Sources',
    '',
    'This repository owns its own local governance and runtime truth.',
    '',
    '## Canonical Sources',
    '',
    '- repo-local AGENTS instructions',
    '- operator and delivery docs',
    '- runtime or deployment policy files',
    '- local journals or evidence logs',
    '',
    '## Shared-Core Boundary',
    '',
    'Shared-core assets are consumed through `.codex/shared-core-consumer.json`.',
    'The shared-core source of truth is the standalone model-agnostic-workflow-system repository.',
    `The repo-intake skill uses ${repoIntakeContract} for consumer-local source selection.`
  ].join('\n');
}

function buildAgentAppend() {
  return [
    '',
    '## Model-Agnostic Workflow System Shared-Core Consumer',
    '- If `.codex/shared-core-consumer.json` exists, read docs/model-agnostic-workflow-system-consumer.md and docs/repo-specific-canonical-sources.md first.',
    `- If ${repoIntakeContract} exists, keep it in sync with ${repoIntakeSkill} before running repo intake.`,
    '- Use the standalone shared-core source only through the consumer manifest.',
    '- Do not edit the standalone model-agnostic-workflow-system repository from this repository.'
  ].join('\n');
}

function buildWrapperScript() {
  return [
    '#!/usr/bin/env node',
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "import { execFileSync } from 'node:child_process';",
    '',
    'const root = process.cwd();',
    "const manifestPath = path.join(root, '.codex', 'shared-core-consumer.json');",
    '',
    'function run() {',
    "  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));",
    "  const output = execFileSync('node', [path.join(manifest.sharedCoreSource, 'scripts', 'tools', 'validate-consumer-linkage.mjs'), '--consumer', root], { cwd: manifest.sharedCoreSource, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });",
    '  console.log(output.trim());',
    '}',
    '',
    'run();'
  ].join('\n');
}

function initConsumerOverlay({ sourceRoot, consumerRoot }) {
  const sourcePackage = readJson(path.join(sourceRoot, 'package.json'));
  const packageFingerprint = fingerprint(sourceRoot).packageFingerprint;
  const consumerName = path.basename(consumerRoot);

  const manifest = {
    consumerRepo: consumerName,
    sharedCoreSource: normalize(sourceRoot),
    sharedCoreMode: 'standalone-local-repo',
    sharedCoreVersion: sourcePackage.version,
    packageFingerprint,
    adoptedSkills: [repoIntakeSkill, ...adoptedSkills],
    deferredSkills,
    localOverlayFiles: [
      repoIntakeContract,
      'docs/model-agnostic-workflow-system-consumer.md',
      'docs/repo-specific-canonical-sources.md',
      'AGENTS.md'
    ],
    localOnlyOverrides: [],
    validationExpectations: [
      'shared-core path exists',
      'shared-core version matches package.json',
      'shared-core fingerprint matches package fingerprint',
      'shared-core validator passes',
      'adopted skills exist in the shared core',
      'consumer overlay docs exist',
      'repo-specific canonical sources are explicit',
      'repo-intake local input contract validates'
    ],
    notes: 'Initial consumer overlay created from model-agnostic-workflow-system.'
  };

  writeFile(path.join(consumerRoot, '.codex', 'shared-core-consumer.json'), JSON.stringify(manifest, null, 2));
  writeFile(path.join(consumerRoot, 'docs', 'model-agnostic-workflow-system-consumer.md'), buildConsumerDoc(sourcePackage.version, packageFingerprint));
  writeFile(path.join(consumerRoot, 'docs', 'repo-specific-canonical-sources.md'), buildCanonicalSourcesDoc());
  writeFile(path.join(consumerRoot, 'scripts', 'tools', 'validate-shared-core-consumer.mjs'), buildWrapperScript());

  const agentsPath = path.join(consumerRoot, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    const current = fs.readFileSync(agentsPath, 'utf8');
    if (!current.includes('Codex Shared-Core Consumer')) {
      writeFile(agentsPath, `${current.trimEnd()}${buildAgentAppend()}`);
    }
  }

  return {
    ok: true,
    consumerRoot: normalize(consumerRoot),
    sourceRoot: normalize(sourceRoot),
    manifestPath: normalize(path.join(consumerRoot, '.codex', 'shared-core-consumer.json')),
    sharedCoreVersion: sourcePackage.version,
    packageFingerprint
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = initConsumerOverlay({ sourceRoot: repoRoot(), consumerRoot: parseArgs(process.argv.slice(2)).consumer });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

export { initConsumerOverlay };

