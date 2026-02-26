import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const ALLOWED_RELATIVE_EXTENSIONS = new Set(['.css']);

const IMPORT_PATTERNS = [
    /(?:import|export)\s+[\s\S]*?\sfrom\s+['\"]([^'\"]+)['\"]/g,
    /import\s+['\"]([^'\"]+)['\"]/g,
    /import\(\s*['\"]([^'\"]+)['\"]\s*\)/g,
];

async function collectFiles(dirPath, files = []) {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            await collectFiles(fullPath, files);
            continue;
        }

        if (entry.isFile() && /\.(js|jsx|ts|tsx)$/i.test(entry.name)) {
            files.push(fullPath);
        }
    }

    return files;
}

function shouldAllowRelativeImport(specifier) {
    const extension = path.extname(specifier);
    return ALLOWED_RELATIVE_EXTENSIONS.has(extension);
}

function getLineNumber(source, index) {
    return source.slice(0, index).split('\n').length;
}

function findViolations(source, absolutePath) {
    const violations = [];
    const relativePath = path.relative(ROOT, absolutePath).replaceAll(path.sep, '/');

    for (const pattern of IMPORT_PATTERNS) {
        pattern.lastIndex = 0;

        let match = pattern.exec(source);
        while (match) {
            const specifier = match[1];

            if (
                specifier?.startsWith('.') &&
                !shouldAllowRelativeImport(specifier)
            ) {
                violations.push({
                    file: relativePath,
                    line: getLineNumber(source, match.index),
                    specifier,
                });
            }

            match = pattern.exec(source);
        }
    }

    return violations;
}

async function main() {
    const files = await collectFiles(SRC_DIR);
    const violations = [];

    for (const filePath of files) {
        const source = await readFile(filePath, 'utf8');
        violations.push(...findViolations(source, filePath));
    }

    if (violations.length === 0) {
        console.log('✓ Import alias lint passed (relative CSS imports are allowed).');
        return;
    }

    console.error('✗ Relative JS/JSX/TS/TSX imports are not allowed. Use namespace aliases.');
    for (const violation of violations) {
        console.error(
            `  - ${violation.file}:${violation.line} -> ${violation.specifier}`
        );
    }

    process.exitCode = 1;
}

main().catch((error) => {
    console.error('Import alias lint failed with an unexpected error.');
    console.error(error);
    process.exit(1);
});
