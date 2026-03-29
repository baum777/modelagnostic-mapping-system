#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readJson, repoRoot } from './_shared.mjs';
import { validateLocalInputContract } from './validate-local-input-contract.mjs';
import { validateRuntimePolicyInputContract } from './validate-runtime-policy-input-contract.mjs';
import { validateSharedCorePackage } from './validate-shared-core-package.mjs';

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

function fingerprint(root) {
  const output = execFileSync('node', ['scripts/tools/calculate-package-fingerprint.mjs'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return JSON.parse(output);
}

function validateConsumerLinkage({ sourceRoot, consumerRoot }) {
  const issues = [];
  const manifestPath = path.join(consumerRoot, '.codex', 'shared-core-consumer.json');
  const parameterizedContracts = [
    {
      skill: 'repo-intake-sot-mapper',
      contract: '.codex/repo-intake-inputs.json',
      validator: validateLocalInputContract
    },
    {
      skill: 'runtime-policy-auditor',
      contract: '.codex/runtime-policy-inputs.json',
      validator: validateRuntimePolicyInputContract
    }
  ];
  if (!fs.existsSync(manifestPath)) {
    return {
      ok: false,
      root: normalize(consumerRoot),
      sourceRoot: normalize(sourceRoot),
      issueCount: 1,
      issues: ['Missing consumer manifest: .codex/shared-core-consumer.json']
    };
  }

  const manifest = readJson(manifestPath);
  const sourcePackage = readJson(path.join(sourceRoot, 'package.json'));
  const packageFingerprint = fingerprint(sourceRoot);
  const sharedCoreValidation = validateSharedCorePackage(sourceRoot);

  if (!sharedCoreValidation.ok) {
    issues.push(...sharedCoreValidation.issues.map((issue) => `shared-core: ${issue}`));
  }

  for (const key of ['consumerRepo', 'sharedCoreSource', 'sharedCoreMode', 'sharedCoreVersion', 'packageFingerprint', 'adoptedSkills', 'deferredSkills', 'localOverlayFiles', 'validationExpectations']) {
    if (manifest[key] == null) {
      issues.push(`Consumer manifest is missing required field ${key}.`);
    }
  }

  if (normalize(manifest.sharedCoreSource || '') !== normalize(sourceRoot)) {
    issues.push(`Shared-core source mismatch: manifest points to ${manifest.sharedCoreSource || '<missing>'}, expected ${normalize(sourceRoot)}.`);
  }

  if (manifest.sharedCoreVersion !== sourcePackage.version) {
    issues.push(`Shared-core version mismatch: manifest has ${manifest.sharedCoreVersion || '<missing>'}, package.json has ${sourcePackage.version || '<missing>'}.`);
  }

  if (manifest.packageFingerprint !== packageFingerprint.packageFingerprint) {
    issues.push(`Shared-core fingerprint mismatch: manifest has ${manifest.packageFingerprint || '<missing>'}, package has ${packageFingerprint.packageFingerprint}.`);
  }

  if (!Array.isArray(manifest.adoptedSkills) || manifest.adoptedSkills.length === 0) {
    issues.push('Consumer manifest adoptedSkills must be a non-empty array.');
  }
  if (!Array.isArray(manifest.deferredSkills)) {
    issues.push('Consumer manifest deferredSkills must be an array.');
  }
  for (const skill of manifest.adoptedSkills || []) {
    const skillPath = path.join(sourceRoot, 'skills', skill, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      issues.push(`Adopted shared-core skill not found: ${skill}`);
    }
  }
  for (const { skill, contract, validator } of parameterizedContracts) {
    if ((manifest.adoptedSkills || []).includes(skill) && (manifest.deferredSkills || []).includes(skill)) {
      issues.push(`Consumer manifest must not list ${skill} in deferredSkills when it is adopted.`);
    }
    if ((manifest.adoptedSkills || []).includes(skill)) {
      if (!(manifest.localOverlayFiles || []).includes(contract)) {
        issues.push(`Consumer manifest must include ${contract} in localOverlayFiles when adopting ${skill}.`);
      }
      const inputContractResult = validator(path.join(consumerRoot, contract), skill);
      if (!inputContractResult.ok) {
        issues.push(...inputContractResult.issues.map((issue) => `${path.basename(contract)}: ${issue}`));
      }
    }
  }
  for (const overlayFile of manifest.localOverlayFiles || []) {
    if (!fs.existsSync(path.join(consumerRoot, overlayFile))) {
      issues.push(`Missing local overlay file: ${overlayFile}`);
    }
  }
  for (const required of ['docs/codex-workflow-consumer.md', 'docs/repo-specific-canonical-sources.md', 'AGENTS.md']) {
    if (!fs.existsSync(path.join(consumerRoot, required))) {
      issues.push(`Required consumer overlay file missing: ${required}`);
    }
  }

  return {
    ok: issues.length === 0,
    root: normalize(consumerRoot),
    sourceRoot: normalize(sourceRoot),
    issueCount: issues.length,
    issues
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const result = validateConsumerLinkage({ sourceRoot: repoRoot(), consumerRoot: args.consumer });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

export { validateConsumerLinkage };
