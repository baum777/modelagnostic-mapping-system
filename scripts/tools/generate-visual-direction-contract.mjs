#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './_shared.mjs';

const VALID_CONTENT_TYPES = new Set(['policy-doc', 'technical-spec', 'support-guidance', 'marketing-copy', 'mixed-general']);
const VALID_TONE = new Set(['neutral-instructional', 'assertive-governance', 'urgent-directive', 'promotional-energetic', 'trust-reassuring']);
const VALID_DENSITY = new Set(['light', 'moderate', 'dense']);
const VALID_CUE = new Set(['low', 'medium', 'high']);
const VALID_HIERARCHY = new Set(['weak', 'moderate', 'strong']);
const VALID_VISUAL_DENSITY = new Set(['compact', 'balanced', 'spacious']);

const COMPONENT_STYLE_BY_POSTURE = {
  'operational-clarity': ['clear-section-dividers', 'high-contrast-data-labels', 'compact-control-groups'],
  'editorial-balance': ['generous-section-spacing', 'measured-typography-contrast', 'focused-callouts'],
  'trust-stable': ['calm-surfaces', 'stable-card-boundaries', 'predictable-cta-placement'],
  'expressive-conversion': ['accent-driven-cta', 'hero-emphasis-block', 'progressive-disclosure-cards']
};

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

function loadProfile(baseRoot, args) {
  if (!args.input) {
    throw new Error('Missing --input <semantic-profile.json>.');
  }

  const absolutePath = path.resolve(baseRoot, args.input);
  const payload = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  return {
    source: absolutePath.replace(/\\/g, '/'),
    payload
  };
}

function normalizeProfileInput(input) {
  const profile = input?.profile && typeof input.profile === 'object' ? input.profile : input;
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new Error('Profile input must be an object or { profile: {...} }.');
  }

  if (!VALID_CONTENT_TYPES.has(profile.contentType)) {
    throw new Error(`Invalid profile.contentType: ${profile.contentType || '<missing>'}.`);
  }
  if (!VALID_TONE.has(profile.tonePosture)) {
    throw new Error(`Invalid profile.tonePosture: ${profile.tonePosture || '<missing>'}.`);
  }
  if (!VALID_DENSITY.has(profile.readingDensity)) {
    throw new Error(`Invalid profile.readingDensity: ${profile.readingDensity || '<missing>'}.`);
  }
  if (!VALID_HIERARCHY.has(profile.hierarchyStrength)) {
    throw new Error(`Invalid profile.hierarchyStrength: ${profile.hierarchyStrength || '<missing>'}.`);
  }
  if (!VALID_VISUAL_DENSITY.has(profile.visualDensityPosture)) {
    throw new Error(`Invalid profile.visualDensityPosture: ${profile.visualDensityPosture || '<missing>'}.`);
  }

  for (const cue of ['urgency', 'trust', 'authority']) {
    if (!VALID_CUE.has(profile.cues?.[cue])) {
      throw new Error(`Invalid profile.cues.${cue}: ${profile.cues?.[cue] || '<missing>'}.`);
    }
  }

  return {
    contentType: profile.contentType,
    tonePosture: profile.tonePosture,
    readingDensity: profile.readingDensity,
    hierarchyStrength: profile.hierarchyStrength,
    visualDensityPosture: profile.visualDensityPosture,
    cues: {
      urgency: profile.cues.urgency,
      trust: profile.cues.trust,
      authority: profile.cues.authority
    },
    audienceHints: Array.isArray(profile.audienceHints) ? profile.audienceHints : []
  };
}

function trustUrgencyEmphasis(cues) {
  const urgencyRank = { low: 1, medium: 2, high: 3 }[cues.urgency];
  const trustRank = { low: 1, medium: 2, high: 3 }[cues.trust];
  if (urgencyRank - trustRank >= 2) return 'urgency-first';
  if (trustRank - urgencyRank >= 2) return 'trust-first';
  return 'balanced';
}

function deriveVisualPosture(profile) {
  if (profile.tonePosture === 'promotional-energetic') return 'expressive-conversion';
  if (profile.contentType === 'marketing-copy' && profile.cues.urgency === 'high') return 'expressive-conversion';
  if (profile.tonePosture === 'trust-reassuring') return 'trust-stable';
  if (profile.contentType === 'technical-spec' || profile.contentType === 'policy-doc' || profile.tonePosture === 'assertive-governance') {
    return 'operational-clarity';
  }
  return 'editorial-balance';
}

function deriveColorEnergy(profile) {
  if (profile.tonePosture === 'promotional-energetic' || profile.cues.urgency === 'high') return 'vivid';
  if (profile.tonePosture === 'trust-reassuring' && profile.cues.urgency === 'low') return 'muted';
  return 'moderate';
}

function deriveMotionPosture(profile, posture, emphasis, energy) {
  if (emphasis === 'urgency-first' && posture === 'expressive-conversion' && energy === 'vivid') {
    return 'assertive';
  }
  if (posture === 'operational-clarity' && emphasis !== 'urgency-first') {
    return 'minimal';
  }
  if (profile.readingDensity === 'dense' || emphasis === 'trust-first') {
    return 'minimal';
  }
  return 'moderate';
}

function deriveResponsiveNotes(densityLevel, hierarchyIntensity, motionPosture, colorEnergy) {
  const notes = new Set([
    'preserve-primary-hierarchy-mobile',
    'collapse-secondary-before-primary',
    'avoid-miniature-desktop-layout'
  ]);

  if (densityLevel === 'compact') {
    notes.add('increase-touch-target-spacing-mobile');
  }
  if (motionPosture === 'assertive') {
    notes.add('reduce-motion-on-small-screens');
  }
  if (colorEnergy === 'vivid') {
    notes.add('preserve-contrast-under-bright-accent');
  }
  if (hierarchyIntensity === 'high') {
    notes.add('maintain-heading-contrast-mobile');
  }

  return [...notes];
}

function generateVisualDirectionContractFromProfile(profileInput) {
  const profile = normalizeProfileInput(profileInput);
  const visualPosture = deriveVisualPosture(profile);

  const densityLevel = profile.visualDensityPosture;
  let hierarchyIntensity = profile.hierarchyStrength === 'weak'
    ? 'low'
    : profile.hierarchyStrength === 'strong'
      ? 'high'
      : 'medium';
  if (visualPosture === 'operational-clarity' && hierarchyIntensity === 'low') {
    hierarchyIntensity = 'medium';
  }

  const colorEnergy = deriveColorEnergy(profile);
  const emphasis = trustUrgencyEmphasis(profile.cues);
  const motionPosture = deriveMotionPosture(profile, visualPosture, emphasis, colorEnergy);

  const componentStyleCues = [...(COMPONENT_STYLE_BY_POSTURE[visualPosture] || [])];
  if (densityLevel === 'compact') {
    componentStyleCues.push('information-chunking');
  }
  if (hierarchyIntensity === 'high') {
    componentStyleCues.push('strong-primary-secondary-contrast');
  }

  const proportionRule = emphasis === 'urgency-first' || densityLevel === 'compact'
    ? 'none'
    : hierarchyIntensity === 'high'
      ? 'golden-ratio-macro-only'
      : 'none';

  const responsiveCautionNotes = deriveResponsiveNotes(densityLevel, hierarchyIntensity, motionPosture, colorEnergy);

  const semanticRationaleRefs = [
    `contentType:${profile.contentType}`,
    `tonePosture:${profile.tonePosture}`,
    `readingDensity:${profile.readingDensity}`,
    `cues.urgency:${profile.cues.urgency}`,
    `cues.trust:${profile.cues.trust}`,
    `cues.authority:${profile.cues.authority}`,
    `hierarchyStrength:${profile.hierarchyStrength}`,
    `visualDensityPosture:${profile.visualDensityPosture}`
  ];

  const contract = {
    visualPosture,
    densityLevel,
    hierarchyIntensity,
    colorEnergy,
    motionPosture,
    trustUrgencyEmphasis: emphasis,
    proportionRule,
    componentStyleCues,
    responsiveCautionNotes,
    semanticRationaleRefs
  };

  return {
    ok: true,
    contractVersion: '1.0.0',
    sourceProfile: profile,
    contract,
    derivationEvidence: {
      rulesApplied: [
        `visualPosture:${visualPosture}`,
        `densityLevel:${densityLevel}`,
        `hierarchyIntensity:${hierarchyIntensity}`,
        `colorEnergy:${colorEnergy}`,
        `motionPosture:${motionPosture}`,
        `trustUrgencyEmphasis:${emphasis}`,
        `proportionRule:${proportionRule}`
      ]
    },
    nonClaims: [
      'This contract is deterministic derivation from normalized semantic signals, not subjective visual art direction.',
      'This contract does not claim rendered layout correctness without downstream implementation checks.'
    ]
  };
}

function printHuman(report) {
  console.log('# Visual Direction Contract');
  console.log('');
  for (const [key, value] of Object.entries(report.contract)) {
    if (Array.isArray(value)) {
      console.log(`- ${key}: ${value.join(', ')}`);
    } else {
      console.log(`- ${key}: ${value}`);
    }
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const loaded = loadProfile(repoRoot(), args);
    const report = generateVisualDirectionContractFromProfile(loaded.payload);
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

export { generateVisualDirectionContractFromProfile, normalizeProfileInput };
