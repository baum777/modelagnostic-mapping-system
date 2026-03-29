#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', 'dist', 'coverage']);
const files = [];

function walk(dir, relativeBase = root) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, relativeBase);
    } else {
      files.push(path.relative(relativeBase, full).replace(/\\/g, '/'));
    }
  }
}

walk(root);
files.sort();
const hash = crypto.createHash('sha256');
for (const file of files) {
  hash.update(file);
  hash.update('\n');
  hash.update(fs.readFileSync(path.join(root, file)));
  hash.update('\n');
}
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const result = {
  packageName: packageJson.name,
  packageVersion: packageJson.version,
  fileCount: files.length,
  packageFingerprint: hash.digest('hex')
};
console.log(JSON.stringify(result, null, 2));
