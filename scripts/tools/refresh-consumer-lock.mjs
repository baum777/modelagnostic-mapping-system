#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readJson, repoRoot } from './_shared.mjs';

const parameterizedContracts = [
  {
    skill: 'repo-intake-sot-mapper',
    contract: '.codex/repo-intake-inputs.json',
    expectation: 'repo-intake local input contract validates'
  },
  {
    skill: 'runtime-policy-auditor',
    contract: '.codex/runtime-policy-inputs.json',
    expectation: 'runtime-policy local input contract validates'
  }
];

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

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function fingerprint(root) {
  const output = execFileSync('node', ['scripts/tools/calculate-package-fingerprint.mjs'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return JSON.parse(output);
}

function refreshConsumerLock({ sourceRoot, consumerRoot }) {
  const manifestPath = path.join(consumerRoot, '.codex', 'shared-core-consumer.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing consumer manifest: ${manifestPath}`);
  }

  const manifest = readJson(manifestPath);
  const packageJson = readJson(path.join(sourceRoot, 'package.json'));
  const fingerprintResult = fingerprint(sourceRoot);

  manifest.consumerRepo = manifest.consumerRepo || path.basename(consumerRoot);
  manifest.sharedCoreSource = normalize(sourceRoot);
  manifest.sharedCoreMode = 'standalone-local-repo';
  manifest.sharedCoreVersion = packageJson.version;
  manifest.packageFingerprint = fingerprintResult.packageFingerprint;
  const overlays = new Set(Array.isArray(manifest.localOverlayFiles) ? manifest.localOverlayFiles : []);
  const deferred = Array.isArray(manifest.deferredSkills) ? [...manifest.deferredSkills] : [];
  const adoptedParameterizedSkills = new Set();
  const validationExpectations = [
    'shared-core path exists',
    'shared-core version matches package.json',
    'shared-core fingerprint matches package fingerprint',
    'shared-core validator passes',
    'adopted skills exist in the shared core',
    'consumer overlay docs exist',
    'repo-specific canonical sources are explicit'
  ];
  for (const { skill, contract, expectation } of parameterizedContracts) {
    if (Array.isArray(manifest.adoptedSkills) && manifest.adoptedSkills.includes(skill)) {
      overlays.add(contract);
      adoptedParameterizedSkills.add(skill);
      if (!validationExpectations.includes(expectation)) {
        validationExpectations.push(expectation);
      }
    }
  }
  manifest.localOverlayFiles = Array.from(overlays);
  manifest.deferredSkills = deferred.filter((entry) => !adoptedParameterizedSkills.has(entry));
  manifest.validationExpectations = validationExpectations;

  writeJson(manifestPath, manifest);
  return {
    ok: true,
    sourceRoot: normalize(sourceRoot),
    consumerRoot: normalize(consumerRoot),
    manifestPath: normalize(manifestPath),
    sharedCoreVersion: packageJson.version,
    packageFingerprint: fingerprintResult.packageFingerprint
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = refreshConsumerLock({ sourceRoot: repoRoot(), consumerRoot: parseArgs(process.argv.slice(2)).consumer });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

export { refreshConsumerLock };
