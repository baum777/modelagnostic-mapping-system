import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import http from 'node:http';

export const RENDER_A11Y_VERSION = '1.0.0';
export const VALID_MODES = new Set(['certification', 'operator-evidence']);
export const FINDING_STATUSES = new Set(['confirmed-issue', 'likely-issue', 'manual-review-area', 'not-assessed']);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

export function normalizePath(filePath) {
  return path.resolve(filePath).replace(/\\/g, '/');
}

export function ensureMode(value) {
  const mode = String(value || 'certification').trim();
  if (!VALID_MODES.has(mode)) {
    throw new Error(`Invalid mode: ${mode}. Expected certification or operator-evidence.`);
  }
  return mode;
}

export function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

export function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function toFileUrl(filePath) {
  return pathToFileURL(path.resolve(filePath)).href;
}

export function classifyIssueStatus({ severity = 'warning', confidence = 'high' } = {}) {
  const normalizedSeverity = String(severity).toLowerCase();
  const normalizedConfidence = String(confidence).toLowerCase();

  if (normalizedSeverity === 'error' || normalizedSeverity === 'critical') {
    return 'confirmed-issue';
  }
  if (normalizedSeverity === 'warning' && normalizedConfidence === 'high') {
    return 'likely-issue';
  }
  if (normalizedSeverity === 'warning' || normalizedSeverity === 'info') {
    return 'manual-review-area';
  }
  return 'not-assessed';
}

export async function startStaticServer(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const server = http.createServer((req, res) => {
    try {
      const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const candidatePath = requestPath === '/' ? '/index.html' : requestPath;
      const absolutePath = path.resolve(root, `.${candidatePath}`);
      const relative = path.relative(root, absolutePath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }
      if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const extension = path.extname(absolutePath).toLowerCase();
      res.setHeader('Content-Type', MIME_TYPES[extension] || 'application/octet-stream');
      fs.createReadStream(absolutePath).pipe(res);
    } catch {
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  const address = await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address()));
  });

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

export function buildEnvelope({ tool, mode, input, runtime, evidence, findings, nonClaims, ok }) {
  return {
    ok,
    tool,
    version: RENDER_A11Y_VERSION,
    mode,
    input,
    runtime,
    evidence,
    findings,
    nonClaims
  };
}