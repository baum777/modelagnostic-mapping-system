#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateServiceModeRequest } from '../service/service-readiness.mjs';

function parseServiceArgs(argv = process.argv.slice(2)) {
  const requestedTransports = [];
  for (const arg of argv) {
    if (arg === '--http') {
      requestedTransports.push('http');
    } else if (arg === '--mcp') {
      requestedTransports.push('mcp');
    } else if (arg === '--remote') {
      requestedTransports.push('remote');
    }
  }

  return {
    explicitServiceFlag: argv.includes('--enable-service-mode'),
    requestedTransports
  };
}

function runRuntimeService({ argv = process.argv.slice(2) } = {}) {
  const args = parseServiceArgs(argv);
  return validateServiceModeRequest(args);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = runRuntimeService();
  const output = JSON.stringify(result, null, 2);
  if (result.ok) {
    console.log(output);
    process.exit(0);
  }
  console.error(result.issues.join('\n'));
  console.error(output);
  process.exit(2);
}

export { parseServiceArgs, runRuntimeService };
