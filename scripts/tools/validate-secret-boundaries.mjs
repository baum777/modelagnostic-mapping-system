#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSimpleYaml, readJson, repoRoot } from './_shared.mjs';
import { scanSecrets } from './scan-secrets.mjs';

const REQUIRED_POLICY_FILES = [
  'docs/secret-handling.md',
  'policies/secret-classes.yaml',
  'policies/tool-capabilities.yaml'
];
const PROVIDER_SWITCH_FIXTURE_PATH = 'evals/fixtures/provider-switch-reminimization.json';
const CLASS_B_REVOCATION_POSTURE = 'required-when-exposed-recoverable-or-outside-approved-boundary';
const CLASS_C_REVOCATION_POSTURE = 'inherit-class-b-when-live-access-attributable-or-uncertain';
const CLASS_C_UNCERTAINTY_BEHAVIOR = 'fail-closed';
const REQUIRED_CLASS_C_LIVE_ACCESS_SIGNALS = [
  'active_credentials',
  'account_access',
  'session_recoverability',
  'live_provider_access'
];
const REQUIRED_SYNTHETIC_PREFIXES = ['SYNTH_SECRET_', 'SAFE_TEST_SECRET_'];
const REQUIRED_SYNTHETIC_PATHS = ['evals/fixtures/'];
const REQUIRED_ALLOWED_ARTIFACT_CLASSES = ['redacted_summary', 'contract_bounded_outcome_summary'];
const REQUIRED_FORBIDDEN_ARTIFACT_CLASSES = [
  'raw_request_payload',
  'raw_response_payload',
  'verbose_json_blob',
  'technical_trace',
  'full_context_replay_artifact',
  'provider_specific_diagnostic_payload'
];
const REQUIRED_FORBIDDEN_ARTIFACT_FIXTURE_COVERAGE = ['raw_request_payload', 'technical_trace'];

function normalize(filePath) {
  return path.resolve(filePath).replace(/\\/g, '/');
}

function loadPolicyYaml(root, relativePath) {
  return parseSimpleYaml(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function normalizeRelativePath(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function normalizePathPrefix(value) {
  const normalized = normalizeRelativePath(value).replace(/^\.?\//, '');
  if (!normalized) {
    return '';
  }
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

function asStringSet(values) {
  return new Set((Array.isArray(values) ? values : []).filter((entry) => typeof entry === 'string' && entry.length > 0));
}

function validateSecretClassRevocationPosture(secretClasses, issues) {
  const classEntries = Array.isArray(secretClasses.classes) ? secretClasses.classes : [];
  const classById = new Map(classEntries.map((entry) => [entry.id, entry]));
  const classB = classById.get('B');
  const classC = classById.get('C');

  if (!classB) {
    issues.push('Class B secret policy is missing from policies/secret-classes.yaml.');
  } else if (classB.revocation_rotation_posture !== CLASS_B_REVOCATION_POSTURE) {
    issues.push(`Class B revocation_rotation_posture must be ${CLASS_B_REVOCATION_POSTURE}.`);
  }

  if (!classC) {
    issues.push('Class C secret policy is missing from policies/secret-classes.yaml.');
    return;
  }
  if (classC.revocation_rotation_posture !== CLASS_C_REVOCATION_POSTURE) {
    issues.push(`Class C revocation_rotation_posture must be ${CLASS_C_REVOCATION_POSTURE}.`);
  }
  const classCLiveAccessSignals = asStringSet(classC.live_access_attribution_signals);
  for (const signal of REQUIRED_CLASS_C_LIVE_ACCESS_SIGNALS) {
    if (!classCLiveAccessSignals.has(signal)) {
      issues.push(`Class C live_access_attribution_signals must include ${signal}.`);
    }
  }
  if (classC.live_access_uncertainty !== CLASS_C_UNCERTAINTY_BEHAVIOR) {
    issues.push(`Class C live_access_uncertainty must be ${CLASS_C_UNCERTAINTY_BEHAVIOR}.`);
  }
}

function validateEvalFixtureSyntheticPolicy(secretClasses, issues) {
  const policy = secretClasses.eval_fixture_secret_policy;
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    issues.push('eval_fixture_secret_policy is missing from policies/secret-classes.yaml.');
    return;
  }

  const allowedValueClasses = asStringSet(policy.allowed_value_classes);
  if (!allowedValueClasses.has('redacted') || !allowedValueClasses.has('synthetic_placeholder')) {
    issues.push('eval_fixture_secret_policy.allowed_value_classes must include redacted and synthetic_placeholder.');
  }

  const syntheticPrefixes = asStringSet(policy.synthetic_prefixes);
  for (const prefix of REQUIRED_SYNTHETIC_PREFIXES) {
    if (!syntheticPrefixes.has(prefix)) {
      issues.push(`eval_fixture_secret_policy.synthetic_prefixes must include ${prefix}.`);
    }
  }

  const syntheticAllowedPathSet = new Set(
    (Array.isArray(policy.synthetic_allowed_paths) ? policy.synthetic_allowed_paths : [])
      .filter((entry) => typeof entry === 'string')
      .map((entry) => normalizePathPrefix(entry))
  );
  for (const requiredPath of REQUIRED_SYNTHETIC_PATHS) {
    if (!syntheticAllowedPathSet.has(normalizePathPrefix(requiredPath))) {
      issues.push(`eval_fixture_secret_policy.synthetic_allowed_paths must include ${requiredPath}.`);
    }
  }

  if (policy.synthetic_outside_allowed_paths !== 'forbidden') {
    issues.push('eval_fixture_secret_policy.synthetic_outside_allowed_paths must be forbidden.');
  }
}

function validateProviderSwitchPolicy(secretClasses, issues) {
  const policy = secretClasses.provider_switch_reminimization;
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    issues.push('provider_switch_reminimization is missing from policies/secret-classes.yaml.');
    return null;
  }

  const allowedSet = asStringSet(policy.allowed_artifact_classes);
  const forbiddenSet = asStringSet(policy.forbidden_artifact_classes);
  for (const artifactClass of REQUIRED_ALLOWED_ARTIFACT_CLASSES) {
    if (!allowedSet.has(artifactClass)) {
      issues.push(`provider_switch_reminimization.allowed_artifact_classes must include ${artifactClass}.`);
    }
  }
  for (const artifactClass of REQUIRED_FORBIDDEN_ARTIFACT_CLASSES) {
    if (!forbiddenSet.has(artifactClass)) {
      issues.push(`provider_switch_reminimization.forbidden_artifact_classes must include ${artifactClass}.`);
    }
  }
  if (policy.unknown_artifact_class !== 'forbidden') {
    issues.push('provider_switch_reminimization.unknown_artifact_class must be forbidden.');
  }

  return {
    allowedSet,
    forbiddenSet,
    unknownArtifactClassBehavior: policy.unknown_artifact_class
  };
}

function evaluateProviderSwitchFixtureCase(caseEntry, providerSwitchPolicy) {
  const caseId = caseEntry.id || '<unnamed>';
  const sample = caseEntry.sample || {};
  const caseIssues = [];
  let observedPass = true;

  if (sample.from_provider === sample.to_provider) {
    observedPass = false;
    caseIssues.push(`provider-switch case ${caseId} must switch providers.`);
  }
  if (sample.context_policy !== 're-minimize') {
    observedPass = false;
    caseIssues.push(`provider-switch case ${caseId} must set context_policy to re-minimize.`);
  }

  const artifactClasses = Array.isArray(sample.artifact_classes) ? sample.artifact_classes : null;
  if (!artifactClasses || artifactClasses.length === 0) {
    observedPass = false;
    caseIssues.push(`provider-switch case ${caseId} must declare artifact_classes.`);
    return {
      expectedPass: caseEntry.expectedPass !== false,
      observedPass,
      artifactClasses: [],
      issues: caseIssues
    };
  }

  for (const artifactClass of artifactClasses) {
    if (typeof artifactClass !== 'string' || artifactClass.trim() === '') {
      observedPass = false;
      caseIssues.push(`provider-switch case ${caseId} has an invalid artifact class entry.`);
      continue;
    }
    if (providerSwitchPolicy.forbiddenSet.has(artifactClass)) {
      observedPass = false;
      caseIssues.push(`provider-switch case ${caseId} includes forbidden artifact class ${artifactClass}.`);
      continue;
    }
    if (!providerSwitchPolicy.allowedSet.has(artifactClass) && providerSwitchPolicy.unknownArtifactClassBehavior === 'forbidden') {
      observedPass = false;
      caseIssues.push(`provider-switch case ${caseId} includes unknown artifact class ${artifactClass}.`);
    }
  }

  return {
    expectedPass: caseEntry.expectedPass !== false,
    observedPass,
    artifactClasses,
    issues: caseIssues
  };
}

function validateProviderSwitchFixture(root, providerSwitchPolicy, issues) {
  const fixturePath = path.join(root, PROVIDER_SWITCH_FIXTURE_PATH);
  if (!fs.existsSync(fixturePath)) {
    issues.push(`Missing provider-switch fixture: ${PROVIDER_SWITCH_FIXTURE_PATH}`);
    return;
  }

  const fixture = readJson(fixturePath);
  const cases = Array.isArray(fixture.cases) ? fixture.cases : [];
  if (cases.length === 0) {
    issues.push(`Provider-switch fixture ${PROVIDER_SWITCH_FIXTURE_PATH} must declare cases.`);
    return;
  }

  const seenAllowedArtifactsInPassingCases = new Set();
  const seenForbiddenArtifactsInFailingCases = new Set();
  let providerSwitchCaseCount = 0;

  for (const caseEntry of cases) {
    if (caseEntry.caseType !== 'provider-switch') {
      continue;
    }
    providerSwitchCaseCount += 1;
    const caseResult = evaluateProviderSwitchFixtureCase(caseEntry, providerSwitchPolicy);
    if (caseResult.observedPass !== caseResult.expectedPass) {
      issues.push(
        `provider-switch fixture case ${caseEntry.id || '<unnamed>'} expected ${caseResult.expectedPass ? 'pass' : 'fail'} but observed ${caseResult.observedPass ? 'pass' : 'fail'}.`
      );
      issues.push(...caseResult.issues);
    }

    if (caseResult.expectedPass) {
      for (const artifactClass of caseResult.artifactClasses) {
        if (providerSwitchPolicy.allowedSet.has(artifactClass)) {
          seenAllowedArtifactsInPassingCases.add(artifactClass);
        }
      }
    } else {
      for (const artifactClass of caseResult.artifactClasses) {
        if (providerSwitchPolicy.forbiddenSet.has(artifactClass)) {
          seenForbiddenArtifactsInFailingCases.add(artifactClass);
        }
      }
    }
  }

  if (providerSwitchCaseCount === 0) {
    issues.push(`Provider-switch fixture ${PROVIDER_SWITCH_FIXTURE_PATH} must include provider-switch cases.`);
    return;
  }

  for (const artifactClass of REQUIRED_ALLOWED_ARTIFACT_CLASSES) {
    if (!seenAllowedArtifactsInPassingCases.has(artifactClass)) {
      issues.push(`Provider-switch fixture must include passing coverage for ${artifactClass}.`);
    }
  }
  for (const artifactClass of REQUIRED_FORBIDDEN_ARTIFACT_FIXTURE_COVERAGE) {
    if (!seenForbiddenArtifactsInFailingCases.has(artifactClass)) {
      issues.push(`Provider-switch fixture must include failing coverage for ${artifactClass}.`);
    }
  }
}

function validateSecretTool(tool, policy, allowedSecretClasses, issues) {
  const name = tool.tool_name || tool.name || '<unnamed>';
  const requiredFields = Array.isArray(policy.required_fields) ? policy.required_fields : [];
  const defaults = policy.defaults || {};
  const enums = policy.enums || {};

  for (const field of requiredFields) {
    if (!(field in tool)) {
      issues.push(`Tool ${name} is missing required secret-boundary field ${field}.`);
    }
  }

  for (const field of requiredFields) {
    if (!(field in defaults)) {
      continue;
    }
    const defaultValue = defaults[field];
    const value = tool[field];
    if (Array.isArray(defaultValue) && !Array.isArray(value)) {
      issues.push(`Tool ${name} field ${field} must be an array.`);
    }
    if (typeof defaultValue === 'boolean' && typeof value !== 'boolean') {
      issues.push(`Tool ${name} field ${field} must be boolean.`);
    }
  }

  for (const [field, allowedValues] of Object.entries(enums)) {
    if (!(field in tool) || !Array.isArray(allowedValues) || allowedValues.length === 0) {
      continue;
    }
    if (!allowedValues.includes(tool[field])) {
      issues.push(`Tool ${name} field ${field} has invalid value ${tool[field]}.`);
    }
  }

  if (tool.raw_secret_exposure !== 'forbidden') {
    issues.push(`Tool ${name} must set raw_secret_exposure to forbidden.`);
  }
  if (tool.trace_redaction !== 'required') {
    issues.push(`Tool ${name} must require trace redaction.`);
  }
  if (tool.memory_persistence !== 'forbidden') {
    issues.push(`Tool ${name} must forbid memory persistence.`);
  }

  for (const secretClass of tool.secret_classes || []) {
    if (!allowedSecretClasses.has(secretClass)) {
      issues.push(`Tool ${name} uses unknown secret class ${secretClass}.`);
    }
  }

  if (tool.requires_secret === true) {
    if (!Array.isArray(tool.secret_classes) || tool.secret_classes.length === 0) {
      issues.push(`Tool ${name} requires secrets but does not declare secret_classes.`);
    }
    if (tool.credential_binding === 'not-applicable') {
      issues.push(`Tool ${name} requires secrets but uses credential_binding not-applicable.`);
    }
    if (tool.access_level === 'none') {
      issues.push(`Tool ${name} requires secrets but uses access_level none.`);
    }
    if (tool.fallback_context_policy === 'not-applicable') {
      issues.push(`Tool ${name} requires secrets but does not declare fallback_context_policy.`);
    }
    if (tool.model_visible !== false) {
      issues.push(`Tool ${name} requires secrets and must set model_visible to false.`);
    }
    if (!Array.isArray(tool.environment_scope) || tool.environment_scope.length === 0) {
      issues.push(`Tool ${name} requires secrets but does not declare environment_scope.`);
    }
  } else {
    if ((tool.secret_classes || []).length !== 0) {
      issues.push(`Tool ${name} does not require secrets and must keep secret_classes empty.`);
    }
    if ((tool.environment_scope || []).length !== 0) {
      issues.push(`Tool ${name} does not require secrets and must keep environment_scope empty.`);
    }
  }
}

function validateProviderSecurity(provider, issues) {
  const requiredFlags = [
    'raw_secret_prompting_forbidden',
    'server_bound_credentials_required',
    'provider_switch_requires_reminimization',
    'fallback_full_context_reuse_forbidden',
    'trace_redaction_required',
    'memory_secret_persistence_forbidden'
  ];

  if (!provider.security || typeof provider.security !== 'object') {
    issues.push(`Provider ${provider.name || '<unnamed>'} is missing security metadata.`);
    return;
  }

  for (const field of requiredFlags) {
    if (provider.security[field] !== true) {
      issues.push(`Provider ${provider.name || '<unnamed>'} must set security.${field} to true.`);
    }
  }
}

function validateSecretBoundaries(baseRoot = repoRoot()) {
  const root = baseRoot;
  const issues = [];

  for (const relativePath of REQUIRED_POLICY_FILES) {
    if (!fs.existsSync(path.join(root, relativePath))) {
      issues.push(`Missing secret-boundary policy file: ${relativePath}`);
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      root: normalize(root),
      issueCount: issues.length,
      issues
    };
  }

  const secretClasses = loadPolicyYaml(root, 'policies/secret-classes.yaml');
  const toolCapabilities = loadPolicyYaml(root, 'policies/tool-capabilities.yaml');
  const toolCatalog = readJson(path.join(root, 'core', 'contracts', 'tool-contracts', 'catalog.json'));
  const providerCapabilities = readJson(path.join(root, 'core', 'contracts', 'provider-capabilities.json'));
  const providerDirs = fs.existsSync(path.join(root, 'providers'))
    ? fs.readdirSync(path.join(root, 'providers'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    : [];
  const allowedSecretClasses = new Set((secretClasses.classes || []).map((entry) => entry.id));
  const providerSwitchPolicy = validateProviderSwitchPolicy(secretClasses, issues);

  validateSecretClassRevocationPosture(secretClasses, issues);
  validateEvalFixtureSyntheticPolicy(secretClasses, issues);
  if (providerSwitchPolicy) {
    validateProviderSwitchFixture(root, providerSwitchPolicy, issues);
  }

  for (const tool of toolCatalog.tools || []) {
    validateSecretTool(tool, toolCapabilities, allowedSecretClasses, issues);
  }

  for (const provider of providerCapabilities.providers || []) {
    validateProviderSecurity(provider, issues);
  }

  for (const providerDir of providerDirs) {
    const exportPath = path.join(root, 'providers', providerDir, 'export.json');
    if (!fs.existsSync(exportPath)) {
      continue;
    }
    const providerExport = readJson(exportPath);
    for (const tool of providerExport.tools || []) {
      validateSecretTool(tool, toolCapabilities, allowedSecretClasses, issues);
    }
    if (providerExport.capabilityProfile) {
      validateProviderSecurity(providerExport.capabilityProfile, issues);
    }
  }

  const secretScan = scanSecrets(root);
  if (!secretScan.ok) {
    for (const finding of secretScan.findings || []) {
      issues.push(`secret-scan finding ${finding.type} in ${finding.file}.`);
    }
  }

  return {
    ok: issues.length === 0,
    root: normalize(root),
    issueCount: issues.length,
    issues
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = validateSecretBoundaries();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

export { validateSecretBoundaries };
