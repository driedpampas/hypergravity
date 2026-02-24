import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import preact from '@preact/preset-vite';
import manifest from './manifest.json';
import monkey from 'vite-plugin-monkey';

export default defineConfig(({ command, mode }) => {
    const isUserscript = process.env.BUILD_TARGET === 'userscript';

    return {
        plugins: [
            preact(),
            isUserscript
                ? monkey({
                      entry: 'src/content.jsx',
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
