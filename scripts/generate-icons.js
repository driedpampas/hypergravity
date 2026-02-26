import { execSync } from 'child_process';
import fs from 'fs';

const IN_SVG = 'public/icons/icon.svg';

const sizes = [16, 48, 128];

fs.mkdirSync('public/icons', { recursive: true });

// Copy the SVG icon as PNG using canvas or simply installing a bun dependency
// We will use sharp to convert.
try {
    // console.log('Installing sharp...');
    // execSync('bun install sharp', { stdio: 'inherit' });
    // console.log('Generating icons...');
    const sharp = await import('sharp');

    for (const size of sizes) {
        const out = `public/icons/icon${size}.png`;
        await sharp.default(IN_SVG).resize(size, size).png().toFile(out);
        console.log('Created ' + out);
    }
} catch (e) {
    console.error(e);
}
