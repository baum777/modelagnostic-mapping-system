#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSkillFrontmatter, readJson, repoRoot } from './_shared.mjs';

const DEFAULT_OUTS = [
  path.join('core', 'contracts', 'core-registry.json'),
  path.join('contracts', 'core-registry.json')
];

function parseArgs(argv) {
  const args = {
    write: false,
    out: DEFAULT_OUTS[0]
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--write') {
      args.write = true;
      continue;
    }
    if (value === '--out' && argv[index + 1]) {
      args.out = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

function normalize(filePath) {
  return path.resolve(filePath).replace(/\\/g, '/');
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return readJson(filePath);
}

function readFirstJson(root, candidates) {
  for (const relativePath of candidates) {
    const absolutePath = path.join(root, relativePath);
    const value = readJsonIfExists(absolutePath);
    if (value) {
      return { path: relativePath, value };
    }
  }
  return null;
}

function extractOutputHeadings(skillText) {
  const lines = skillText.split(/\r?\n/);
  const headings = [];
  let inOutput = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '## Output') {
      inOutput = true;
      continue;
    }
    if (inOutput && line.startsWith('## ')) {
      break;
    }
    if (!inOutput) {
      continue;
    }

    const match = line.match(/^-\s+`([^`]+)`\s*$/);
    if (match) {
      headings.push(match[1]);
      continue;
    }

    const plain = line.match(/^-\s+(.+)$/);
    if (plain) {
      headings.push(plain[1].replace(/^`|`$/g, ''));
    }
  }

  return headings;
}

function loadProviderCapabilities(root) {
  const candidate = readFirstJson(root, [
    path.join('core', 'contracts', 'provider-capabilities.json'),
    path.join('contracts', 'provider-capabilities.json')
  ]);

  if (candidate) {
    return candidate.value;
  }

  return { schemaVersion: '1.0.0', providers: [] };
}

function buildProviderCompatibility(providerCapabilities) {
  const compatibility = {};
  for (const provider of providerCapabilities.providers || []) {
    const canonicalStatus = provider.skillPackaging === 'compatibility-export' ? 'compatibility-export' : 'adapter';
    compatibility[provider.name] = canonicalStatus;
    for (const alias of provider.aliases || []) {
      compatibility[alias] = 'compatibility-export';
    }
    for (const legacy of provider.legacyExportDirectories || []) {
      compatibility[legacy] = 'compatibility-export';
    }
  }
  return compatibility;
}

function buildSkillContracts(root) {
  const manifestPath = path.join(root, 'core', 'contracts', 'portable-skill-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return new Map();
  }

  const manifest = readJson(manifestPath);
  const contracts = new Map();
  for (const entry of Array.isArray(manifest.skills) ? manifest.skills : []) {
    if (entry && typeof entry.name === 'string') {
      contracts.set(entry.name, entry);
    }
  }
  return contracts;
}

function skillRoots(root) {
  return [
    path.join(root, 'core', 'skills'),
    path.join(root, 'skills')
  ];
}

function buildSkillRecords(root, providerCapabilities) {
  const contracts = buildSkillContracts(root);
  const providerCompatibility = buildProviderCompatibility(providerCapabilities);
  const seen = new Set();
  const records = [];

  for (const skillRoot of skillRoots(root)) {
    if (!fs.existsSync(skillRoot)) {
      continue;
    }

    const entries = fs.readdirSync(skillRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const skillPath = path.join(skillRoot, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillPath)) {
        continue;
      }

      const frontmatter = parseSkillFrontmatter(fs.readFileSync(skillPath, 'utf8'));
      const name = frontmatter.name || entry.name;
      if (seen.has(name)) {
        continue;
      }
      seen.add(name);

      const contract = contracts.get(name) || {};
      const classification = frontmatter.classification || contract.classification || 'unknown';
      const safeToAutoRun = frontmatter.safe_to_auto_run === true;
      const approvalMode = contract.approvalMode || (safeToAutoRun ? 'read-only' : 'approval-required');
      const outputHeadings = extractOutputHeadings(fs.readFileSync(skillPath, 'utf8'));

      records.push({
        name,
        portableIdentity: contract.portableIdentity || null,
        sourcePath: `${skillRoot.startsWith(path.join(root, 'core')) ? 'core/skills' : 'skills'}/${entry.name}/SKILL.md`,
        classification,
        requiresRepoInputs: frontmatter.requires_repo_inputs === true,
        producesStructuredOutput: frontmatter.produces_structured_output === true,
        safeToAutoRun,
        status: frontmatter.status || 'unknown',
        approvalMode,
        subagentPolicy: contract.subagentPolicy || (classification === 'shared-with-local-inputs' ? 'forbid' : 'allow'),
        requiredTools: Array.isArray(contract.requiredTools) ? contract.requiredTools : [],
        optionalTools: Array.isArray(contract.optionalTools) ? contract.optionalTools : [],
        outputHeadings,
        outputContractId: contract.outputContractId || null,
        outputContractPath: contract.outputContractPath || frontmatter.output_contract_path || null,
        toolContractCatalogPath: contract.toolContractCatalogPath || frontmatter.tool_contract_catalog_path || null,
        providerProjections: contract.providerProjection || null,
        evalScaffold: contract.evalScaffold || null,
        providerCompatibility
      });
    }
  }

  return records.sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeLegacyTool(tool) {
  const name = tool.tool_name || tool.name;
  const inputs = Array.isArray(tool.inputs) ? tool.inputs : [];
  const outputs = Array.isArray(tool.outputs) ? tool.outputs : [];
  return {
    tool_name: name,
    intent_class: tool.intent_class || (String(tool.sideEffects || '').startsWith('writes') ? 'mutating' : 'read-only'),
    schema: tool.schema || {
      type: 'object',
      properties: Object.fromEntries(inputs.map((input) => [input.name, { type: input.type === 'boolean' ? 'boolean' : input.type === 'json' ? 'object' : input.type === 'string[]' ? 'array' : 'string' }])),
      additionalProperties: false
    },
    side_effects: tool.side_effects || tool.sideEffects || 'read-only',
    approval_required: tool.approval_required ?? tool.approvalRequirement === 'required',
    mcp_compatible: tool.mcp_compatible ?? false,
    providers: Array.isArray(tool.providers) ? tool.providers : [],
    routing_hints: Array.isArray(tool.routing_hints) ? tool.routing_hints : [name],
    name,
    purpose: tool.purpose || null,
    inputs,
    outputs,
    sideEffects: tool.sideEffects || tool.side_effects || 'read-only',
    approvalRequirement: tool.approvalRequirement || (tool.approval_required ? 'required' : 'none'),
    failureBehavior: tool.failureBehavior || 'unspecified',
    exampleInvocation: tool.exampleInvocation || null,
    implementationStatus: tool.implementationStatus || 'contract-only',
    sourcePath: tool.entrypoint || tool.sourcePath || null
  };
}

function buildToolRecords(root, providerCapabilities) {
  const providerCompatibility = buildProviderCompatibility(providerCapabilities);
  const seen = new Set();
  const records = [];
  const candidateCatalogs = [
    path.join(root, 'core', 'contracts', 'tool-contracts', 'catalog.json'),
    path.join(root, 'docs', 'tool-contracts', 'catalog.json')
  ];

  for (const catalogPath of candidateCatalogs) {
    if (!fs.existsSync(catalogPath)) {
      continue;
    }
    const catalog = readJson(catalogPath);
    for (const rawTool of Array.isArray(catalog.tools) ? catalog.tools : []) {
      const tool = normalizeLegacyTool(rawTool);
      if (seen.has(tool.tool_name)) {
        continue;
      }
      seen.add(tool.tool_name);

      records.push({
        ...tool,
        providers: tool.providers.length > 0 ? tool.providers : Object.keys(providerCompatibility),
        providerCompatibility,
        tool_name: tool.tool_name,
        routing_hints: tool.routing_hints
      });
    }
  }

  return records.sort((left, right) => left.tool_name.localeCompare(right.tool_name));
}

function buildNeutralCoreRegistry(baseRoot = repoRoot()) {
  const root = baseRoot;
  const providerCapabilities = loadProviderCapabilities(root);
  const providers = Array.isArray(providerCapabilities.providers) ? providerCapabilities.providers : [];
  const providerNames = providers.map((provider) => provider.name);

  return {
    schemaVersion: '1.0.0',
    core: {
      name: 'agent-workflow-core',
      status: 'provider-neutral',
      sourcePackage: {
        name: 'codex-workflow-core',
        version: readJson(path.join(root, 'package.json')).version
      },
      compatibilityExports: providers.map((provider) => ({
        provider: provider.name,
        aliases: provider.aliases || [],
        legacyExportDirectories: provider.legacyExportDirectories || [],
        manifestPath: `providers/${provider.name}/export.json`,
        status: provider.skillPackaging === 'compatibility-export' ? 'compatibility-export' : 'adapter'
      })).concat([
        {
          provider: 'codex',
          manifestPath: '.codex-plugin/plugin.json',
          status: 'compatibility-export'
        }
      ])
    },
    skills: buildSkillRecords(root, providerCapabilities).map((skill) => ({
      ...skill,
      providerCompatibility: skill.providerCompatibility
    })),
    tools: buildToolRecords(root, providerCapabilities),
    providers
  };
}

function writeRegistry(root, outPath, registry) {
  const targetPaths = [
    outPath,
    ...DEFAULT_OUTS.filter((candidate) => path.resolve(path.join(root, candidate)) !== path.resolve(path.join(root, outPath)))
  ];

  const receipts = [];
  for (const targetPath of targetPaths) {
    const absoluteOutPath = path.join(root, targetPath);
    fs.mkdirSync(path.dirname(absoluteOutPath), { recursive: true });
    fs.writeFileSync(absoluteOutPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
    receipts.push(normalize(absoluteOutPath));
  }
  return receipts;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const registry = buildNeutralCoreRegistry();
  if (args.write) {
    const written = writeRegistry(repoRoot(), args.out, registry);
    console.log(JSON.stringify({ ok: true, written }, null, 2));
    process.exit(0);
  }
  console.log(JSON.stringify(registry, null, 2));
}

export { buildNeutralCoreRegistry };
