#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const cached = process.argv.includes('--cached');
const args = ['diff', '--stat'];
if (cached) {
  args.push('--cached');
}

try {
  const stat = execFileSync('git', args, { encoding: 'utf8' }).trim();
  const names = execFileSync('git', ['diff', '--name-only', ...(cached ? ['--cached'] : [])], { encoding: 'utf8' }).trim();
  const status = execFileSync('git', ['status', '--short'], { encoding: 'utf8' }).trim();

  console.log('# Git Diff Explainer');
  console.log('');
  console.log(`Mode: ${cached ? 'staged' : 'working tree'}`);
  console.log('');
  console.log('## Changed Files');
  console.log(names ? names.split('\n').map((line) => `- ${line}`).join('\n') : '- none');
  console.log('');
  console.log('## Stat');
  console.log(stat || 'No diff stat available.');
  console.log('');
  console.log('## Status');
  console.log(status || 'Clean');
} catch (error) {
  console.error(`git-diff-explainer failed: ${error.message}`);
  process.exit(1);
}
