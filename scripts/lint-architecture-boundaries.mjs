import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

const RULES = [
    {
        from: /^src\/modules\//,
        disallow: [/^@platform\/content\//, /^@app\//],
        message: 'modules cannot import from platform-content/app layers',
    },
    {
        from: /^src\/features\//,
        disallow: [/^@app\//],
        message: 'features cannot import from app layer',
    },
    {
        from: /^src\/tools\//,
        disallow: [/^@app\//],
        message: 'tools cannot import from app layer',
    },
];

const IMPORT_PATTERNS = [
    /(?:import|export)\s+[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
];

const FAIL_ON_VIOLATION = process.env.HG_ARCH_FAIL === '1';

async function collectSourceFiles(dirPath, files = []) {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            await collectSourceFiles(fullPath, files);
            continue;
        }

        if (entry.isFile() && /\.(ts|tsx|js|jsx)$/i.test(entry.name)) {
            files.push(fullPath);
        }
    }

    return files;
}

function getLineNumber(source, index) {
    return source.slice(0, index).split('\n').length;
}

function findViolationForImport(relativeFilePath, specifier) {
    for (const rule of RULES) {
        if (!rule.from.test(relativeFilePath)) continue;

        for (const blocked of rule.disallow) {
            if (blocked.test(specifier)) {
                return rule.message;
            }
        }
    }

    return null;
}

function findViolations(source, absolutePath) {
    const relativeFilePath = path.relative(ROOT, absolutePath).replaceAll(path.sep, '/');
    const violations = [];

    for (const pattern of IMPORT_PATTERNS) {
        pattern.lastIndex = 0;

        let match = pattern.exec(source);
        while (match) {
            const specifier = match[1];
            const reason = findViolationForImport(relativeFilePath, specifier);

            if (reason) {
                violations.push({
                    file: relativeFilePath,
                    line: getLineNumber(source, match.index),
                    specifier,
                    reason,
                });
            }

            match = pattern.exec(source);
        }
    }

    return violations;
}

async function main() {
    const files = await collectSourceFiles(SRC_DIR);
    const violations = [];

    for (const filePath of files) {
        const source = await readFile(filePath, 'utf8');
        violations.push(...findViolations(source, filePath));
    }

    if (violations.length === 0) {
        console.log('✓ Architecture boundary lint passed.');
        return;
    }

    const mode = FAIL_ON_VIOLATION ? 'error' : 'warning';
    const marker = FAIL_ON_VIOLATION ? '✗' : '⚠';

    console.log(
        `${marker} Architecture boundary lint found ${violations.length} ${mode}${violations.length > 1 ? 's' : ''}.`
    );

    for (const violation of violations) {
        console.log(
            `  - ${violation.file}:${violation.line} -> ${violation.specifier} (${violation.reason})`
        );
    }

    if (FAIL_ON_VIOLATION) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error('Architecture boundary lint failed unexpectedly.');
    console.error(error);
    process.exit(1);
});
