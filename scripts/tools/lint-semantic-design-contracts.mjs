#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './_shared.mjs';

const ALLOWED_VALUES = {
  visualPosture: new Set(['operational-clarity', 'editorial-balance', 'trust-stable', 'expressive-conversion']),
  densityLevel: new Set(['compact', 'balanced', 'spacious']),
  hierarchyIntensity: new Set(['low', 'medium', 'high']),
  colorEnergy: new Set(['muted', 'moderate', 'vivid']),
  motionPosture: new Set(['minimal', 'moderate', 'assertive']),
  trustUrgencyEmphasis: new Set(['trust-first', 'balanced', 'urgency-first']),
  proportionRule: new Set(['none', 'golden-ratio-macro-only'])
};

const ALLOWED_COMPONENT_STYLE_CUES = new Set([
  'clear-section-dividers',
  'high-contrast-data-labels',
  'compact-control-groups',
  'generous-section-spacing',
  'measured-typography-contrast',
  'focused-callouts',
  'calm-surfaces',
  'stable-card-boundaries',
  'predictable-cta-placement',
  'accent-driven-cta',
  'hero-emphasis-block',
  'progressive-disclosure-cards',
  'information-chunking',
  'strong-primary-secondary-contrast'
]);

const ALLOWED_RESPONSIVE_NOTES = new Set([
  'preserve-primary-hierarchy-mobile',
  'collapse-secondary-before-primary',
  'avoid-miniature-desktop-layout',
  'increase-touch-target-spacing-mobile',
  'reduce-motion-on-small-screens',
  'preserve-contrast-under-bright-accent',
  'maintain-heading-contrast-mobile'
]);

const REQUIRED_FIELDS = [
  'visualPosture',
  'densityLevel',
  'hierarchyIntensity',
  'colorEnergy',
  'motionPosture',
  'trustUrgencyEmphasis',
  'proportionRule',
  'componentStyleCues',
  'responsiveCautionNotes',
  'semanticRationaleRefs'
];

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

function normalizeInputPayload(payload) {
  if (Array.isArray(payload)) {
    return payload.map((entry, index) => ({
      id: `contract[${index}]`,
      contract: entry?.contract && typeof entry.contract === 'object' ? entry.contract : entry
    }));
  }

  return [{
    id: 'contract',
    contract: payload?.contract && typeof payload.contract === 'object' ? payload.contract : payload
  }];
}

function pushFinding(findings, severity, code, message, pathRef, suggestedFix) {
  findings.push({ severity, code, message, path: pathRef, suggestedFix });
}

function lintSingleContract(contract, prefix = 'contract') {
  const findings = [];

  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    pushFinding(findings, 'error', 'contract.invalid_shape', 'Contract must be a JSON object.', prefix, 'Provide a JSON object with the required bounded fields.');
    return findings;
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in contract)) {
      pushFinding(findings, 'error', 'field.required_missing', `Missing required field "${field}".`, `${prefix}.${field}`, `Add "${field}" with an allowed value.`);
    }
  }

  for (const [field, allowed] of Object.entries(ALLOWED_VALUES)) {
    const value = contract[field];
    if (value == null) continue;
    if (!allowed.has(value)) {
      pushFinding(findings, 'error', 'field.invalid_enum', `Invalid ${field} value "${value}".`, `${prefix}.${field}`, `Use one of: ${[...allowed].join(', ')}.`);
    }
  }

  const componentStyleCues = contract.componentStyleCues;
  if (!Array.isArray(componentStyleCues) || componentStyleCues.length === 0) {
    pushFinding(findings, 'error', 'field.invalid_array', 'componentStyleCues must be a non-empty array.', `${prefix}.componentStyleCues`, 'Provide one or more bounded component style cue codes.');
  } else {
    for (const cue of componentStyleCues) {
      if (!ALLOWED_COMPONENT_STYLE_CUES.has(cue)) {
        pushFinding(findings, 'error', 'field.invalid_component_cue', `Unsupported component style cue "${cue}".`, `${prefix}.componentStyleCues`, 'Use only bounded component style cue codes.');
      }
    }
  }

  const responsiveNotes = contract.responsiveCautionNotes;
  if (!Array.isArray(responsiveNotes) || responsiveNotes.length === 0) {
    pushFinding(findings, 'error', 'field.invalid_array', 'responsiveCautionNotes must be a non-empty array.', `${prefix}.responsiveCautionNotes`, 'Provide bounded responsive/accessibility caution note codes.');
  } else {
    for (const note of responsiveNotes) {
      if (!ALLOWED_RESPONSIVE_NOTES.has(note)) {
        pushFinding(findings, 'error', 'field.invalid_responsive_note', `Unsupported responsive note "${note}".`, `${prefix}.responsiveCautionNotes`, 'Use only bounded responsive caution note codes.');
      }
    }
  }

  const rationale = contract.semanticRationaleRefs;
  if (!Array.isArray(rationale) || rationale.length === 0) {
    pushFinding(findings, 'error', 'field.invalid_array', 'semanticRationaleRefs must be a non-empty array.', `${prefix}.semanticRationaleRefs`, 'Add rationale refs such as contentType:technical-spec and tonePosture:neutral-instructional.');
  } else {
    for (const ref of rationale) {
      if (typeof ref !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_.-]+:[^\s].+$/.test(ref)) {
        pushFinding(findings, 'error', 'field.invalid_rationale_ref', `Invalid rationale ref "${ref}".`, `${prefix}.semanticRationaleRefs`, 'Use key:value format, for example cues.urgency:high.');
      }
    }

    for (const requiredPrefix of ['contentType:', 'tonePosture:', 'readingDensity:', 'cues.urgency:']) {
      if (!rationale.some((ref) => ref.startsWith(requiredPrefix))) {
        pushFinding(findings, 'warning', 'rationale.missing_signal_link', `Missing semantic rationale link for ${requiredPrefix.slice(0, -1)}.`, `${prefix}.semanticRationaleRefs`, `Add a ${requiredPrefix}<value> reference.`);
      }
    }
  }

  if (contract.visualPosture === 'operational-clarity' && contract.hierarchyIntensity === 'low') {
    pushFinding(findings, 'error', 'consistency.hierarchy_too_low', 'operational-clarity posture conflicts with low hierarchyIntensity.', prefix, 'Raise hierarchyIntensity to medium/high or change visualPosture.');
  }

  if (contract.densityLevel === 'compact' && contract.proportionRule === 'golden-ratio-macro-only') {
    pushFinding(findings, 'error', 'consistency.proportion_conflict', 'Compact density cannot use golden-ratio-macro-only proportion rule.', prefix, 'Set proportionRule to none for compact density.');
  }

  if (contract.trustUrgencyEmphasis === 'trust-first' && contract.colorEnergy === 'vivid' && contract.motionPosture === 'assertive') {
    pushFinding(findings, 'warning', 'consistency.trust_vs_intensity', 'trust-first emphasis conflicts with vivid energy plus assertive motion.', prefix, 'Reduce colorEnergy or motionPosture for trust-first posture.');
  }

  if (contract.trustUrgencyEmphasis === 'urgency-first' && contract.colorEnergy === 'muted' && contract.motionPosture === 'minimal') {
    pushFinding(findings, 'warning', 'consistency.urgency_underexpressed', 'urgency-first emphasis is underexpressed by muted colorEnergy and minimal motion.', prefix, 'Increase energy or motion to better match urgency-first posture.');
  }

  const noteSet = new Set(Array.isArray(contract.responsiveCautionNotes) ? contract.responsiveCautionNotes : []);
  if (contract.densityLevel === 'compact' && !noteSet.has('increase-touch-target-spacing-mobile')) {
    pushFinding(findings, 'error', 'guardrail.compact_missing_touch_target_note', 'Compact density requires increase-touch-target-spacing-mobile note.', `${prefix}.responsiveCautionNotes`, 'Add increase-touch-target-spacing-mobile.');
  }
  if (contract.colorEnergy === 'vivid' && !noteSet.has('preserve-contrast-under-bright-accent')) {
    pushFinding(findings, 'error', 'guardrail.vivid_missing_contrast_note', 'Vivid color energy requires preserve-contrast-under-bright-accent note.', `${prefix}.responsiveCautionNotes`, 'Add preserve-contrast-under-bright-accent.');
  }
  if (contract.motionPosture === 'assertive' && !noteSet.has('reduce-motion-on-small-screens')) {
    pushFinding(findings, 'error', 'guardrail.motion_missing_reduction_note', 'Assertive motion requires reduce-motion-on-small-screens note.', `${prefix}.responsiveCautionNotes`, 'Add reduce-motion-on-small-screens.');
  }
  if (contract.hierarchyIntensity === 'high' && !noteSet.has('collapse-secondary-before-primary')) {
    pushFinding(findings, 'error', 'guardrail.hierarchy_missing_collapse_note', 'High hierarchy intensity requires collapse-secondary-before-primary note.', `${prefix}.responsiveCautionNotes`, 'Add collapse-secondary-before-primary.');
  }

  return findings;
}

function lintSemanticDesignContractsDocument(payload) {
  const normalized = normalizeInputPayload(payload);
  const findings = [];
  for (const entry of normalized) {
    findings.push(...lintSingleContract(entry.contract, entry.id));
  }

  const errorCount = findings.filter((entry) => entry.severity === 'error').length;
  const warningCount = findings.filter((entry) => entry.severity === 'warning').length;

  return {
    ok: errorCount === 0,
    contractsChecked: normalized.length,
    errorCount,
    warningCount,
    findings
  };
}

function printHuman(report) {
  console.log('# Semantic Design Contract Lint');
  console.log('');
  console.log(`- contractsChecked: ${report.contractsChecked}`);
  console.log(`- errors: ${report.errorCount}`);
  console.log(`- warnings: ${report.warningCount}`);
  if (report.findings.length === 0) {
    console.log('');
    console.log('No lint findings.');
    return;
  }
  console.log('');
  console.log('## Findings');
  for (const finding of report.findings) {
    console.log(`- [${finding.severity}] ${finding.code} @ ${finding.path}`);
    console.log(`  ${finding.message}`);
    console.log(`  fix: ${finding.suggestedFix}`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.input) {
      throw new Error('Missing --input <contract.json>.');
    }
    const absolutePath = path.resolve(repoRoot(), args.input);
    const payload = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    const report = lintSemanticDesignContractsDocument(payload);
    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printHuman(report);
    }
    process.exit(report.ok ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

export { lintSemanticDesignContractsDocument, lintSingleContract };