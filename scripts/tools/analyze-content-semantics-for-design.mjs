#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './_shared.mjs';

const VALID_CONTENT_TYPES = new Set(['policy-doc', 'technical-spec', 'support-guidance', 'marketing-copy', 'mixed-general']);
const VALID_AUDIENCE_HINTS = new Set(['operator', 'engineer', 'executive', 'general-user', 'designer', 'compliance']);

const CONTENT_TYPE_KEYWORDS = {
  'policy-doc': ['policy', 'governance', 'authority', 'contract', 'compliance', 'must', 'shall', 'gate', 'validator', 'audit'],
  'technical-spec': ['api', 'schema', 'json', 'interface', 'type', 'script', 'fixture', 'function', 'contract', 'eval'],
  'support-guidance': ['step', 'how', 'guide', 'troubleshoot', 'error', 'fix', 'help', 'issue', 'support', 'checklist'],
  'marketing-copy': ['launch', 'brand', 'customer', 'delight', 'story', 'audience', 'campaign', 'growth', 'value', 'engagement']
};

const CUE_KEYWORDS = {
  urgency: ['urgent', 'immediately', 'asap', 'critical', 'deadline', 'now', 'blocker', 'escalate', 'must'],
  trust: ['reliable', 'trusted', 'stable', 'evidence', 'verified', 'safety', 'safe', 'assurance', 'transparent', 'clear'],
  authority: ['policy', 'required', 'mandatory', 'governance', 'contract', 'compliance', 'shall', 'must', 'authoritative', 'canonical']
};

const AUDIENCE_KEYWORDS = {
  operator: ['runbook', 'incident', 'rollout', 'rollback', 'ops', 'monitor', 'gate', 'status'],
  engineer: ['api', 'schema', 'script', 'function', 'test', 'fixture', 'validator', 'contract'],
  executive: ['roadmap', 'strategy', 'business', 'impact', 'stakeholder', 'kpi', 'outcome'],
  'general-user': ['user', 'customer', 'onboarding', 'help', 'guide', 'experience'],
  designer: ['layout', 'typography', 'spacing', 'color', 'visual', 'hierarchy', 'component'],
  compliance: ['policy', 'compliance', 'regulation', 'audit', 'authority', 'mandatory']
};

function parseArgs(argv) {
  const args = {
    input: null,
    text: null,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--input' && argv[index + 1]) {
      args.input = argv[index + 1];
      index += 1;
    } else if (value === '--text' && argv[index + 1]) {
      args.text = argv[index + 1];
      index += 1;
    } else if (value === '--json') {
      args.json = true;
    }
  }

  return args;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreKeywords(tokens, keywords) {
  const tokenSet = new Set(tokens);
  let score = 0;
  const matches = [];
  for (const keyword of keywords) {
    if (tokenSet.has(keyword)) {
      score += 1;
      matches.push(keyword);
    }
  }
  return { score, matches };
}

function normalizeAudienceHint(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || '').trim())
      .filter((entry) => VALID_AUDIENCE_HINTS.has(entry));
  }
  if (typeof value === 'string' && VALID_AUDIENCE_HINTS.has(value.trim())) {
    return [value.trim()];
  }
  return [];
}

function loadInputPayload(baseRoot, args) {
  if (args.input && args.text) {
    throw new Error('Use either --input or --text, not both.');
  }

  if (!args.input && !args.text) {
    throw new Error('Missing input. Use --input <file> or --text <content>.');
  }

  if (args.text) {
    return {
      source: 'inline-text',
      content: args.text,
      contentTypeHint: null,
      audienceHint: []
    };
  }

  const absolutePath = path.resolve(baseRoot, args.input);
  const raw = fs.readFileSync(absolutePath, 'utf8');

  if (absolutePath.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      return {
        source: absolutePath.replace(/\\/g, '/'),
        content: parsed,
        contentTypeHint: null,
        audienceHint: []
      };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('JSON input must be a string or an object with a content field.');
    }

    if (typeof parsed.content !== 'string' || parsed.content.trim() === '') {
      throw new Error('JSON input object must include non-empty string field "content".');
    }

    return {
      source: absolutePath.replace(/\\/g, '/'),
      content: parsed.content,
      contentTypeHint: VALID_CONTENT_TYPES.has(parsed.contentTypeHint) ? parsed.contentTypeHint : null,
      audienceHint: normalizeAudienceHint(parsed.audienceHint)
    };
  }

  return {
    source: absolutePath.replace(/\\/g, '/'),
    content: raw,
    contentTypeHint: null,
    audienceHint: []
  };
}

function cueLevel(score) {
  if (score >= 7) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

function contentTypeFromScores(scores) {
  const sorted = Object.entries(scores)
    .sort((left, right) => right[1] - left[1]);

  if (!sorted.length || sorted[0][1] <= 0) {
    return 'mixed-general';
  }

  const [topType, topScore] = sorted[0];
  const secondScore = sorted[1]?.[1] ?? 0;
  if (topScore - secondScore <= 1 && secondScore > 0) {
    return 'mixed-general';
  }

  return topType;
}

function hierarchyStrength(counts) {
  let score = 0;
  if (counts.headingLines >= 3) score += 2;
  if (counts.bulletLines >= 4) score += 1;
  if (counts.numberedLines >= 2) score += 1;
  if (counts.avgWordsPerSentence <= 22) score += 1;

  if (score >= 4) return { level: 'strong', score };
  if (score >= 2) return { level: 'moderate', score };
  return { level: 'weak', score };
}

function readingDensity(counts) {
  if (counts.wordCount >= 900 || counts.avgWordsPerSentence >= 24) return 'dense';
  if (counts.wordCount >= 280 || counts.avgWordsPerSentence >= 16) return 'moderate';
  return 'light';
}

function detectAudienceHints(tokens, hintCandidates) {
  const hints = new Set(hintCandidates || []);
  const evidence = {};

  for (const [audience, keywords] of Object.entries(AUDIENCE_KEYWORDS)) {
    const match = scoreKeywords(tokens, keywords);
    evidence[audience] = match;
    if (match.score >= 2) {
      hints.add(audience);
    }
  }

  if (hints.size === 0) {
    hints.add('general-user');
  }

  return {
    hints: [...hints].sort(),
    evidence
  };
}

function analyzeContentSemanticsForDesign(inputPayload) {
  const content = String(inputPayload.content || '');
  const lines = content.split(/\r?\n/);
  const tokens = tokenize(content);
  const wordCount = tokens.length;
  const sentenceCount = Math.max(1, content.split(/[.!?]+/).map((value) => value.trim()).filter(Boolean).length);
  const headingLines = lines.filter((line) => /^\s*#{1,6}\s+/.test(line) || /^\s*[A-Z][A-Za-z0-9\s/_-]+:\s*$/.test(line)).length;
  const bulletLines = lines.filter((line) => /^\s*[-*]\s+/.test(line)).length;
  const numberedLines = lines.filter((line) => /^\s*\d+\.\s+/.test(line)).length;
  const exclamationCount = (content.match(/!/g) || []).length;
  const questionCount = (content.match(/\?/g) || []).length;

  const counts = {
    lineCount: lines.length,
    wordCount,
    sentenceCount,
    avgWordsPerSentence: Number((wordCount / sentenceCount).toFixed(2)),
    headingLines,
    bulletLines,
    numberedLines,
    exclamationCount,
    questionCount
  };

  const contentTypeScores = {};
  const contentTypeMatches = {};
  for (const [type, keywords] of Object.entries(CONTENT_TYPE_KEYWORDS)) {
    const result = scoreKeywords(tokens, keywords);
    contentTypeScores[type] = result.score;
    contentTypeMatches[type] = result.matches;
  }

  if (inputPayload.contentTypeHint) {
    contentTypeScores[inputPayload.contentTypeHint] = (contentTypeScores[inputPayload.contentTypeHint] || 0) + 2;
  }

  const urgencyBase = scoreKeywords(tokens, CUE_KEYWORDS.urgency);
  const trustBase = scoreKeywords(tokens, CUE_KEYWORDS.trust);
  const authorityBase = scoreKeywords(tokens, CUE_KEYWORDS.authority);

  const cueScores = {
    urgency: urgencyBase.score + (exclamationCount > 0 ? 1 : 0) + (questionCount > 4 ? 1 : 0),
    trust: trustBase.score,
    authority: authorityBase.score + (counts.headingLines >= 3 ? 1 : 0)
  };

  const contentType = contentTypeFromScores(contentTypeScores);
  const hierarchy = hierarchyStrength(counts);
  const density = readingDensity(counts);

  let tonePosture = 'neutral-instructional';
  if (cueLevel(cueScores.urgency) === 'high') {
    tonePosture = 'urgent-directive';
  } else if (contentType === 'marketing-copy' && cueLevel(cueScores.trust) === 'low') {
    tonePosture = 'promotional-energetic';
  } else if (cueLevel(cueScores.authority) === 'high') {
    tonePosture = 'assertive-governance';
  } else if (cueLevel(cueScores.trust) === 'high') {
    tonePosture = 'trust-reassuring';
  }

  let visualDensityPosture = 'balanced';
  if (density === 'dense' || hierarchy.level === 'weak') {
    visualDensityPosture = 'compact';
  } else if (density === 'light' && hierarchy.level === 'strong') {
    visualDensityPosture = 'spacious';
  }

  const audience = detectAudienceHints(tokens, inputPayload.audienceHint);

  const matchedRules = [];
  for (const [type, score] of Object.entries(contentTypeScores)) {
    if (score > 0) {
      matchedRules.push(`contentType:${type}`);
    }
  }
  for (const [cue, score] of Object.entries(cueScores)) {
    if (score > 0) {
      matchedRules.push(`cue:${cue}`);
    }
  }

  return {
    ok: true,
    profileVersion: '1.0.0',
    input: {
      source: inputPayload.source,
      contentLength: content.length,
      contentTypeHint: inputPayload.contentTypeHint,
      audienceHint: inputPayload.audienceHint
    },
    profile: {
      contentType,
      tonePosture,
      readingDensity: density,
      cues: {
        urgency: cueLevel(cueScores.urgency),
        trust: cueLevel(cueScores.trust),
        authority: cueLevel(cueScores.authority)
      },
      audienceHints: audience.hints,
      hierarchyStrength: hierarchy.level,
      visualDensityPosture
    },
    evidence: {
      counts,
      contentTypeScores,
      cueScores,
      hierarchyScore: hierarchy.score,
      contentTypeKeywordMatches: contentTypeMatches,
      cueKeywordMatches: {
        urgency: urgencyBase.matches,
        trust: trustBase.matches,
        authority: authorityBase.matches
      },
      audienceMatches: audience.evidence,
      matchedRules: matchedRules.sort()
    },
    nonClaims: [
      'No probabilistic NLP or model inference is used; outputs are deterministic lexical and structural heuristics.',
      'This profile does not perform subjective design quality review.',
      'This profile does not inspect rendered UI, runtime DOM, or computed styles.'
    ]
  };
}

function printHuman(report) {
  console.log('# Semantic Design Profile');
  console.log('');
  console.log(`- source: ${report.input.source}`);
  console.log(`- contentType: ${report.profile.contentType}`);
  console.log(`- tonePosture: ${report.profile.tonePosture}`);
  console.log(`- readingDensity: ${report.profile.readingDensity}`);
  console.log(`- hierarchyStrength: ${report.profile.hierarchyStrength}`);
  console.log(`- visualDensityPosture: ${report.profile.visualDensityPosture}`);
  console.log(`- cues: urgency=${report.profile.cues.urgency}, trust=${report.profile.cues.trust}, authority=${report.profile.cues.authority}`);
  console.log(`- audienceHints: ${report.profile.audienceHints.join(', ')}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const payload = loadInputPayload(repoRoot(), args);
    const report = analyzeContentSemanticsForDesign(payload);
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

export { analyzeContentSemanticsForDesign, loadInputPayload };