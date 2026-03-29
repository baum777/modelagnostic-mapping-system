#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const fileIndex = process.argv.indexOf('--file');
const mustContainIndex = process.argv.indexOf('--must-contain');
const file = fileIndex >= 0 ? process.argv[fileIndex + 1] : '';
const mustContain = mustContainIndex >= 0 ? process.argv[mustContainIndex + 1].split(',').map((value) => value.trim()).filter(Boolean) : [];

if (!file || mustContain.length === 0) {
  console.error('Usage: node scripts/tools/spec-compliance-checker.mjs --file <path> --must-contain A,B,C');
  process.exit(2);
}

const resolved = path.resolve(file);
const content = fs.readFileSync(resolved, 'utf8');
const missing = mustContain.filter((needle) => !content.includes(needle));
const report = {
  file: resolved,
  ok: missing.length === 0,
  missing
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
