import fs from 'node:fs';

const IN_SVG = 'public/icons/icon.svg';

const sizes = [16, 48, 128];

fs.mkdirSync('public/icons', { recursive: true });

try {
    const sharp = await import('sharp');

    for (const size of sizes) {
        const out = `public/icons/icon${size}.png`;
        await sharp.default(IN_SVG).resize(size, size).png().toFile(out);
        console.log(`Created ${out}`);
    }
} catch (e) {
    console.error(e);
}
