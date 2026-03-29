#!/usr/bin/env node
import path from 'node:path';
import { repoRoot, isInsideRoot, writeText } from './_shared.mjs';

const targetIndex = process.argv.indexOf('--target');
const contentIndex = process.argv.indexOf('--content');
const approved = process.argv.includes('--approved');
const target = targetIndex >= 0 ? process.argv[targetIndex + 1] : '';
const content = contentIndex >= 0 ? process.argv[contentIndex + 1] : '';

if (!approved) {
  console.error('Write refused: approval flag is required.');
  process.exit(3);
}
if (!target || content == null) {
  console.error('Usage: node scripts/tools/approval-gated-write-executor.mjs --target <path> --approved --content <text>');
  process.exit(2);
}

const root = repoRoot();
const resolved = path.resolve(root, target);
if (!isInsideRoot(root, resolved)) {
  console.error(`Write refused: target escapes repository root: ${resolved}`);
  process.exit(4);
}

writeText(resolved, content);
const bytes = Buffer.byteLength(content, 'utf8');
console.log(JSON.stringify({ ok: true, target: resolved, bytes }, null, 2));
