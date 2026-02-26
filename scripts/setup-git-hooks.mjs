#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const hooksDir = resolve(repoRoot, '.githooks');
const prePushHook = resolve(hooksDir, 'pre-push');

if (!existsSync(hooksDir)) {
    console.error('Missing .githooks directory.');
    process.exit(1);
}

execSync('git config core.hooksPath .githooks', {
    cwd: repoRoot,
    stdio: 'inherit',
});

if (existsSync(prePushHook)) {
    chmodSync(prePushHook, 0o755);
}

console.log('Git hooks configured to use .githooks');
