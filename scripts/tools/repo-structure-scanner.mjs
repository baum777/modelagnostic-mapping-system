#!/usr/bin/env node
import path from 'node:path';
import { exists, listFilesRecursive, printJson, repoRoot } from './_shared.mjs';

const root = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : repoRoot());
const json = process.argv.includes('--json');

const keyDirs = ['docs', 'skills', 'scripts/tools', 'templates/codex-workflow', 'examples/codex-workflow'];
const inventory = {
  root,
  keyDirs: keyDirs.map((dir) => ({ path: dir, exists: exists(path.join(root, dir)) })),
  skills: [],
  docs: [],
  scripts: [],
  templates: [],
  examples: []
};

for (const entry of listFilesRecursive(path.join(root, 'skills'), (fullPath, relativePath) => relativePath.endsWith('/SKILL.md') || relativePath === 'SKILL.md')) {
  inventory.skills.push(entry.relativePath);
}
for (const entry of listFilesRecursive(path.join(root, 'docs'), () => true)) {
  inventory.docs.push(entry.relativePath);
}
for (const entry of listFilesRecursive(path.join(root, 'scripts', 'tools'), () => true)) {
  inventory.scripts.push(entry.relativePath);
}
for (const entry of listFilesRecursive(path.join(root, 'templates', 'codex-workflow'), () => true)) {
  inventory.templates.push(entry.relativePath);
}
for (const entry of listFilesRecursive(path.join(root, 'examples', 'codex-workflow'), () => true)) {
  inventory.examples.push(entry.relativePath);
}

if (json) {
  printJson(inventory);
} else {
  console.log('# Repository Structure Scan');
  console.log(`Root: ${root}`);
  console.log('');
  console.log('## Key Directories');
  for (const dir of inventory.keyDirs) {
    console.log(`- ${dir.path}: ${dir.exists ? 'present' : 'missing'}`);
  }
  console.log('');
  console.log('## Skills');
  for (const skill of inventory.skills.sort()) {
    console.log(`- ${skill}`);
  }
}
