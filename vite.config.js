import { fileURLToPath, URL } from 'node:url';
import { crx } from '@crxjs/vite-plugin';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import manifest from './manifest.json';

const srcPath = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig(({ mode }) => {
    const isUserscript = process.env.BUILD_TARGET === 'userscript';
    const stripDebug = mode === 'release' || process.env.HG_STRIP_DEBUG === '1';

    return {
        define: {
            __HG_DEBUG_BUILD__: JSON.stringify(!stripDebug),
        },
        resolve: {
            alias: {
                '@src': srcPath,
                '@content': fileURLToPath(new URL('./src/content', import.meta.url)),
                '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
                '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
                '@icons': fileURLToPath(new URL('./src/icons', import.meta.url)),
                '@managers': fileURLToPath(new URL('./src/managers', import.meta.url)),
                '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
                '@tools': fileURLToPath(new URL('./src/tools', import.meta.url)),
                '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
            },
        },
        plugins: [
            preact(),
            isUserscript
                ? monkey({
                      entry: 'src/content.tsx',
                      userscript: {
                          name: manifest.name,
                          version: manifest.version,
                          description: manifest.description,
                          match: manifest.content_scripts[0].matches,
                          grant: [
                              'GM_getValue',
                              'GM_setValue',
                              'GM_addValueChangeListener',
                              'GM_removeValueChangeListener',
                              'GM_deleteValue',
                              'GM_openInTab',
                              'window.close',
                          ],
                      },
                      build: {},
                  })
                : crx({ manifest }),
        ],
        server: {
            port: 5173,
            strictPort: true,
            hmr: {
                port: 5173,
            },
            origin: 'http://localhost:5173',
            cors: true,
        },
    };
});
