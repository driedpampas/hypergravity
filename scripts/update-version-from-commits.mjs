#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const packageJsonPath = resolve(repoRoot, 'package.json');
const manifestJsonPath = resolve(repoRoot, 'manifest.json');

function getCommitCount() {
    const output = execSync('git rev-list --count HEAD', {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'inherit'],
    })
        .toString()
        .trim();

    const count = Number.parseInt(output, 10);

    if (!Number.isInteger(count) || count <= 0) {
        throw new Error(`Invalid commit count: ${output}`);
    }

    return count;
}

function updateJsonFile(filePath, updater) {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const updated = updater(parsed);
    writeFileSync(filePath, `${JSON.stringify(updated, null, 4)}\n`, 'utf8');
}

function updateTopLevelStringPropertyPreservingFormatting(filePath, key, value) {
    const raw = readFileSync(filePath, 'utf8');
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^\\s*"${escapedKey}"\\s*:\\s*")([^"]*)("\\s*,?)`, 'm');

    if (!pattern.test(raw)) {
        throw new Error(`Could not find top-level string property "${key}" in ${filePath}`);
    }

    const updated = raw.replace(pattern, `$1${value}$3`);
    writeFileSync(filePath, updated, 'utf8');
}

const commitCount = getCommitCount();
const nextVersion = `${commitCount}`;

updateJsonFile(packageJsonPath, (pkg) => ({
    ...pkg,
    version: nextVersion,
}));

updateTopLevelStringPropertyPreservingFormatting(manifestJsonPath, 'version', nextVersion);

console.log(`Updated version to ${nextVersion}`);
