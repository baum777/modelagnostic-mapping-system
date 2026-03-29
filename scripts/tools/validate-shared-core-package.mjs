#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, repoRoot } from './_shared.mjs';
import { validateSharedCoreScaffold } from './validate-shared-core-scaffold.mjs';

const semverLike = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;
const requiredPluginFields = ['name', 'version', 'skills'];

export function validateSharedCorePackage(baseRoot = repoRoot()) {
  const root = baseRoot;
  const issues = [];

  const scaffold = validateSharedCoreScaffold(root);
  if (!scaffold.ok) {
    issues.push(...scaffold.issues.map((issue) => `scaffold: ${issue}`));
  }

  let packageJson;
  try {
    packageJson = readJson(path.join(root, 'package.json'));
    if (packageJson.name !== 'codex-workflow-core') {
      issues.push(`package.json name must be codex-workflow-core; found ${packageJson.name || '<missing>'}.`);
    }
    if (!semverLike.test(String(packageJson.version || ''))) {
      issues.push(`package.json version must be semver-like; found ${packageJson.version || '<missing>'}.`);
    }
    if (packageJson.private !== true) {
      issues.push('package.json private must be true.');
    }
    if (packageJson.type !== 'module') {
      issues.push('package.json type must be module.');
    }
    for (const scriptName of ['validate', 'check', 'fingerprint', 'refresh-lock', 'validate-consumer', 'validate-input-contract', 'validate-runtime-policy-input-contract']) {
      if (!packageJson.scripts || typeof packageJson.scripts[scriptName] !== 'string' || packageJson.scripts[scriptName].length === 0) {
        issues.push(`package.json must define a ${scriptName} script.`);
      }
    }
  } catch (error) {
    issues.push(`package.json parse failed: ${error.message}`);
  }

  const changelogPath = path.join(root, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) {
    issues.push('Missing CHANGELOG.md.');
  } else if (packageJson?.version) {
    const changelog = fs.readFileSync(changelogPath, 'utf8');
    if (!changelog.includes(`## ${packageJson.version}`)) {
      issues.push(`CHANGELOG.md must include an entry for version ${packageJson.version}.`);
    }
  }

  const pluginPath = path.join(root, '.codex-plugin', 'plugin.json');
  if (!fs.existsSync(pluginPath)) {
    issues.push('Missing .codex-plugin/plugin.json.');
  } else {
    try {
      const plugin = readJson(pluginPath);
      for (const field of requiredPluginFields) {
        if (plugin[field] == null || plugin[field] === '') {
          issues.push(`plugin.json is missing required field ${field}.`);
        }
      }
      if (packageJson && plugin.name !== packageJson.name) {
        issues.push(`plugin.json name must match package.json name; found ${plugin.name || '<missing>'}.`);
      }
      if (packageJson && plugin.version !== packageJson.version) {
        issues.push(`plugin.json version must match package.json version; found ${plugin.version || '<missing>'}.`);
      }
      if (plugin.skills !== './skills/') {
        issues.push(`plugin.json skills path must be ./skills/; found ${plugin.skills || '<missing>'}.`);
      }
    } catch (error) {
      issues.push(`plugin.json parse failed: ${error.message}`);
    }
  }

  return {
    ok: issues.length === 0,
    root,
    issueCount: issues.length,
    issues
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = validateSharedCorePackage();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
