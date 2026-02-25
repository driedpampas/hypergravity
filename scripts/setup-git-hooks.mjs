#!/usr/bin/env node
import { chmodSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const hooksDir = resolve(repoRoot, '.githooks');
const preCommitHook = resolve(hooksDir, 'pre-commit');

if (!existsSync(hooksDir)) {
    console.error('Missing .githooks directory.');
    process.exit(1);
}

execSync('git config core.hooksPath .githooks', {
    cwd: repoRoot,
    stdio: 'inherit',
});

if (existsSync(preCommitHook)) {
    chmodSync(preCommitHook, 0o755);
}

console.log('Git hooks configured to use .githooks');
