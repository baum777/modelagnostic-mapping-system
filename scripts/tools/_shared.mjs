import fs from 'node:fs';
import path from 'node:path';

export function repoRoot() {
  return process.cwd();
}

export function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

export function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

export function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

export function exists(filePath) {
  return fs.existsSync(filePath);
}

export function isInsideRoot(rootPath, targetPath) {
  const root = path.resolve(rootPath);
  const target = path.resolve(targetPath);
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function listFilesRecursive(rootPath, predicate = () => true, relativeBase = rootPath, output = []) {
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') {
      continue;
    }
    const fullPath = path.join(rootPath, entry.name);
    const relativePath = path.relative(relativeBase, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      listFilesRecursive(fullPath, predicate, relativeBase, output);
    } else if (predicate(fullPath, relativePath)) {
      output.push({ fullPath, relativePath });
    }
  }
  return output;
}

export function parseSkillFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error('Missing YAML frontmatter.');
  }
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf(':');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const raw = trimmed.slice(index + 1).trim();
    const value = raw.replace(/^["']|["']$/g, '');
    if (value === 'true') {
      fields[key] = true;
    } else if (value === 'false') {
      fields[key] = false;
    } else {
      fields[key] = value;
    }
  }
  return fields;
}

export function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
