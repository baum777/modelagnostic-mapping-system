#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNeutralCoreRegistry } from './build-neutral-core-registry.mjs';
import { buildProviderExports } from './build-provider-exports.mjs';
import { readJson, repoRoot } from './_shared.mjs';

function normalize(filePath) {
  return path.resolve(filePath).replace(/\\/g, '/');
}

function loadEvalCatalog(root) {
  const catalogPath = path.join(root, 'evals', 'catalog.json');
  if (!fs.existsSync(catalogPath)) {
    throw new Error('Missing eval catalog: evals/catalog.json');
  }
  const catalog = readJson(catalogPath);
  if (!Array.isArray(catalog.fixtures) || catalog.fixtures.length === 0) {
    throw new Error('Eval catalog must declare a non-empty fixtures array.');
  }
  return catalog;
}

function loadEvalFixture(root, fixtureRef) {
  if (typeof fixtureRef === 'object' && fixtureRef !== null) {
    return fixtureRef;
  }
  if (typeof fixtureRef !== 'string' || fixtureRef.trim() === '') {
    throw new Error('Eval catalog fixture entries must be strings or objects.');
  }

  const fixturePath = path.join(root, 'evals', fixtureRef);
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Missing eval fixture: ${fixtureRef}`);
  }
  return readJson(fixturePath);
}

function loadEvalFixtures(root, catalog) {
  const refs = Array.isArray(catalog.fixtures) ? catalog.fixtures : [];
  return refs.map((fixtureRef) => loadEvalFixture(root, fixtureRef));
}

function loadProviderExports(root) {
  const exports = {};
  const providerExports = buildProviderExports(root, {});
  const providerCapabilitiesPath = [
    path.join(root, 'core', 'contracts', 'provider-capabilities.json'),
    path.join(root, 'contracts', 'provider-capabilities.json')
  ].find((candidate) => fs.existsSync(candidate));
  const providerCapabilities = providerCapabilitiesPath ? readJson(providerCapabilitiesPath) : { providers: [] };

  for (const { provider, export: exportJson } of providerExports) {
    exports[provider] = exportJson;
    const capability = (providerCapabilities.providers || []).find((entry) => entry.name === provider);
    for (const alias of capability?.aliases || []) {
      exports[alias] = exportJson;
    }
    for (const legacy of capability?.legacyExportDirectories || []) {
      exports[legacy] = exportJson;
    }
  }
  return exports;
}

function sameJson(left, right) {
  return JSON.stringify(left, null, 2) === JSON.stringify(right, null, 2);
}

function evaluateToolSelection(registry, fixture) {
  const result = {
    passed: true,
    issues: []
  };
  const targetName = fixture.target?.name;
  const skill = registry.skills.find((entry) => entry.name === targetName);
  if (!skill) {
    result.passed = false;
    result.issues.push(`Registry does not include skill ${targetName}.`);
    return result;
  }

  const requiredTools = Array.isArray(fixture.expectations.requiredTools) ? fixture.expectations.requiredTools : [];
  const optionalTools = Array.isArray(fixture.expectations.optionalTools) ? fixture.expectations.optionalTools : [];
  for (const requiredTool of requiredTools) {
    if (!Array.isArray(skill.requiredTools) || !skill.requiredTools.includes(requiredTool)) {
      result.passed = false;
      result.issues.push(`Skill ${targetName} does not declare required tool ${requiredTool}.`);
    }
  }
  for (const optionalTool of optionalTools) {
    if (!Array.isArray(skill.optionalTools) || !skill.optionalTools.includes(optionalTool)) {
      result.issues.push(`Skill ${targetName} does not declare optional tool ${optionalTool}.`);
    }
  }

  return result;
}

function evaluateFixture(root, registry, providerExports, fixture) {
  const result = {
    id: fixture.id,
    kind: fixture.kind,
    blocking: fixture.blocking !== false,
    passed: true,
    issues: []
  };

  const targetName = fixture.target?.name;
  if (!targetName) {
    result.passed = false;
    result.issues.push('Fixture missing target.name.');
    return result;
  }

  if (fixture.kind === 'routing') {
    for (const providerName of fixture.expectations.providers || []) {
      const providerExport = providerExports[providerName];
      if (!providerExport) {
        result.passed = false;
        result.issues.push(`Missing provider export for ${providerName}.`);
        continue;
      }
      const skill = providerExport.skills.find((entry) => entry.name === targetName);
      if (!skill) {
        result.passed = false;
        result.issues.push(`Provider ${providerName} does not export skill ${targetName}.`);
      }
    }
  } else if (fixture.kind === 'schema') {
    const registrySkill = registry.skills.find((entry) => entry.name === targetName);
    if (!registrySkill) {
      result.passed = false;
      result.issues.push(`Registry does not include skill ${targetName}.`);
    } else if (!Array.isArray(registrySkill.outputHeadings) || registrySkill.outputHeadings.length === 0) {
      result.passed = false;
      result.issues.push(`Skill ${targetName} does not declare output headings.`);
    } else if (fixture.expectations.outputHeadings && !sameJson(registrySkill.outputHeadings, fixture.expectations.outputHeadings)) {
      result.passed = false;
      result.issues.push(`Skill ${targetName} output headings do not match the fixture.`);
    }
  } else if (fixture.kind === 'tool-selection') {
    const check = evaluateToolSelection(registry, fixture);
    result.passed = check.passed;
    result.issues.push(...check.issues);
  } else if (fixture.kind === 'approval-boundary') {
    const tool = registry.tools.find((entry) => entry.tool_name === targetName || entry.name === targetName);
    if (!tool) {
      result.passed = false;
      result.issues.push(`Registry does not include tool ${targetName}.`);
    } else {
      if (fixture.expectations.approvalRequirement && tool.approvalRequirement !== fixture.expectations.approvalRequirement) {
        result.passed = false;
        result.issues.push(`Tool ${targetName} approval requirement is ${tool.approvalRequirement}, expected ${fixture.expectations.approvalRequirement}.`);
      }
      if (fixture.expectations.sideEffects && tool.sideEffects !== fixture.expectations.sideEffects) {
        result.passed = false;
        result.issues.push(`Tool ${targetName} sideEffects is ${tool.sideEffects}, expected ${fixture.expectations.sideEffects}.`);
      }
    }
  } else if (fixture.kind === 'provider-parity') {
    const baselineProvider = fixture.expectations.baselineProvider || 'openai-codex';
    const baseline = providerExports[baselineProvider]?.skills.find((entry) => entry.name === targetName);
    if (!baseline) {
      result.passed = false;
      result.issues.push(`Baseline provider ${baselineProvider} does not export skill ${targetName}.`);
    } else {
      for (const providerName of fixture.expectations.providers || []) {
        const providerSkill = providerExports[providerName]?.skills.find((entry) => entry.name === targetName);
        if (!providerSkill) {
          result.passed = false;
          result.issues.push(`Provider ${providerName} does not export skill ${targetName}.`);
          continue;
        }
        if (!sameJson(providerSkill.outputHeadings, baseline.outputHeadings)) {
          result.passed = false;
          result.issues.push(`Provider ${providerName} output headings diverge for ${targetName}.`);
        }
      }
    }
  } else if (fixture.kind === 'failure-mode') {
    const skill = registry.skills.find((entry) => entry.name === targetName);
    if (!skill) {
      result.passed = false;
      result.issues.push(`Registry does not include skill ${targetName}.`);
    } else {
      if (fixture.expectations.requiresRepoInputs !== undefined && skill.requiresRepoInputs !== fixture.expectations.requiresRepoInputs) {
        result.passed = false;
        result.issues.push(`Skill ${targetName} requiresRepoInputs mismatch.`);
      }
      if (fixture.expectations.subagentPolicy && skill.subagentPolicy !== fixture.expectations.subagentPolicy) {
        result.passed = false;
        result.issues.push(`Skill ${targetName} subagentPolicy is ${skill.subagentPolicy}, expected ${fixture.expectations.subagentPolicy}.`);
      }
    }
  } else {
    result.passed = false;
    result.issues.push(`Unsupported eval kind: ${fixture.kind}`);
  }

  return result;
}

function runCertificationEvals(baseRoot = repoRoot()) {
  const root = baseRoot;
  const catalog = loadEvalCatalog(root);
  const registry = buildNeutralCoreRegistry(root);
  const providerExports = loadProviderExports(root);
  const fixtures = loadEvalFixtures(root, catalog);
  const results = fixtures.map((fixture) => evaluateFixture(root, registry, providerExports, fixture));
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  const blockingFailures = results.filter((result) => !result.passed && result.blocking).length;

  return {
    ok: failed === 0,
    root: normalize(root),
    suite: catalog.suite || 'provider-neutral-certification',
    total: results.length,
    passed,
    failed,
    blockingFailures,
    results
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const result = runCertificationEvals();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

export { runCertificationEvals };
