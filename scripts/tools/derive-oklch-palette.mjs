#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './_shared.mjs';
import { generateVisualDirectionContractFromProfile } from './generate-visual-direction-contract.mjs';

function parseArgs(argv) {
  const args = {
    input: null,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--input' && argv[index + 1]) {
      args.input = argv[index + 1];
      index += 1;
    } else if (value === '--json') {
      args.json = true;
    }
  }

  return args;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Number(value.toFixed(3));
}

function parseInputPayload(baseRoot, args) {
  if (!args.input) {
    throw new Error('Missing --input <semantic-profile-or-contract.json>.');
  }
  const absolutePath = path.resolve(baseRoot, args.input);
  const payload = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  return {
    source: absolutePath.replace(/\\/g, '/'),
    payload
  };
}

function resolveContract(payload) {
  if (payload?.contract && typeof payload.contract === 'object') {
    return payload.contract;
  }

  if (payload?.profile || payload?.contentType) {
    return generateVisualDirectionContractFromProfile(payload).contract;
  }

  throw new Error('Input must contain a visual-direction contract or a semantic profile.');
}

function deriveHue(contract) {
  if (contract.trustUrgencyEmphasis === 'urgency-first') return 30;
  if (contract.trustUrgencyEmphasis === 'trust-first') return 235;
  if (contract.visualPosture === 'expressive-conversion') return 340;
  return 210;
}

function deriveChroma(contract) {
  if (contract.colorEnergy === 'muted') return 0.04;
  if (contract.colorEnergy === 'vivid') return 0.18;
  return 0.1;
}

function buildRoles(contract) {
  const hue = deriveHue(contract);
  const chroma = deriveChroma(contract);

  const baseBackgroundL = contract.densityLevel === 'compact' ? 0.955 : contract.densityLevel === 'spacious' ? 0.985 : 0.97;
  const elevatedSurfaceL = baseBackgroundL - 0.03;
  const primaryTextL = contract.trustUrgencyEmphasis === 'urgency-first' ? 0.2 : 0.22;
  const secondaryTextL = primaryTextL + 0.22;

  const accentL = contract.colorEnergy === 'vivid' ? 0.62 : contract.colorEnergy === 'muted' ? 0.68 : 0.65;
  const accentC = chroma;

  const ctaL = contract.trustUrgencyEmphasis === 'urgency-first' ? accentL - 0.04 : accentL - 0.02;
  const ctaC = clamp(accentC + 0.03, 0, 0.25);

  const warningL = contract.trustUrgencyEmphasis === 'urgency-first' ? 0.6 : 0.64;
  const warningC = clamp(chroma + 0.04, 0.08, 0.25);

  const mutedSupportL = baseBackgroundL - 0.06;
  const mutedSupportC = 0.03;

  return {
    baseBackground: { l: round(baseBackgroundL), c: round(0.012), h: round(hue), alpha: 1 },
    elevatedSurface: { l: round(elevatedSurfaceL), c: round(0.016), h: round(hue), alpha: 1 },
    primaryText: { l: round(primaryTextL), c: round(0.03), h: round(hue), alpha: 1 },
    secondaryText: { l: round(secondaryTextL), c: round(0.025), h: round(hue), alpha: 1 },
    accent: { l: round(accentL), c: round(accentC), h: round(hue), alpha: 1 },
    ctaEmphasis: { l: round(ctaL), c: round(ctaC), h: round(hue), alpha: 1 },
    warningDanger: { l: round(warningL), c: round(warningC), h: 28, alpha: 1 },
    mutedSupport: { l: round(mutedSupportL), c: round(mutedSupportC), h: round(hue), alpha: 1 }
  };
}

function evaluateGuardrails(roles) {
  const order = [
    ['baseBackground', roles.baseBackground.l],
    ['elevatedSurface', roles.elevatedSurface.l],
    ['mutedSupport', roles.mutedSupport.l],
    ['secondaryText', roles.secondaryText.l],
    ['primaryText', roles.primaryText.l]
  ];

  let orderValid = true;
  for (let index = 0; index < order.length - 1; index += 1) {
    if (order[index][1] <= order[index + 1][1]) {
      orderValid = false;
      break;
    }
  }

  const primaryTextContrastIntent = roles.baseBackground.l - roles.primaryText.l;
  const secondaryTextContrastIntent = roles.baseBackground.l - roles.secondaryText.l;

  return {
    lightnessOrderValid: orderValid,
    contrastIntent: {
      'primaryText-vs-baseBackground': round(primaryTextContrastIntent),
      'secondaryText-vs-baseBackground': round(secondaryTextContrastIntent)
    },
    checks: [
      {
        code: 'guardrail.lightness_order',
        ok: orderValid,
        note: 'Expected descending lightness from backgrounds to text roles.'
      },
      {
        code: 'guardrail.primary_text_contrast_intent',
        ok: primaryTextContrastIntent >= 0.68,
        note: 'Intent-level contrast check for primary text against base background.'
      },
      {
        code: 'guardrail.secondary_text_contrast_intent',
        ok: secondaryTextContrastIntent >= 0.45,
        note: 'Intent-level contrast check for secondary text against base background.'
      }
    ],
    nonClaims: [
      'Contrast checks are intent-level OKLCH heuristics, not WCAG-rendered contrast verification.',
      'Palette output is role-based recommendation; it does not include runtime theming implementation.'
    ]
  };
}

function deriveOklchPalette(payload) {
  const contract = resolveContract(payload);
  const roles = buildRoles(contract);
  const guardrails = evaluateGuardrails(roles);

  return {
    ok: true,
    paletteVersion: '1.0.0',
    model: 'oklch',
    sourceSignals: {
      visualPosture: contract.visualPosture,
      densityLevel: contract.densityLevel,
      hierarchyIntensity: contract.hierarchyIntensity,
      colorEnergy: contract.colorEnergy,
      motionPosture: contract.motionPosture,
      trustUrgencyEmphasis: contract.trustUrgencyEmphasis
    },
    roles,
    guardrails
  };
}

function printHuman(report) {
  console.log('# Derived OKLCH Palette');
  console.log('');
  for (const [role, value] of Object.entries(report.roles)) {
    console.log(`- ${role}: l=${value.l} c=${value.c} h=${value.h}`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const loaded = parseInputPayload(repoRoot(), args);
    const report = deriveOklchPalette(loaded.payload);
    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printHuman(report);
    }
    process.exit(0);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

export { deriveOklchPalette };