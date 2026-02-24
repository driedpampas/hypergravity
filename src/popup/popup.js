import {
    getStorageValue,
    setStorageValue,
    getVersion,
} from '../utils/browserEnv';

const CACHE_KEY = 'hg_token_hash_cache';

function showStatus(message, type = '') {
    const el = document.getElementById('hg-status');
    el.textContent = message;
    el.className = 'hg-popup-status' + (type ? ` ${type}` : '');
    if (type) {
        setTimeout(() => {
            el.textContent = '';
            el.className = 'hg-popup-status';
        }, 3000);
    }
}

async function loadCacheData() {
    return (await getStorageValue(CACHE_KEY)) || {};
}

async function saveCacheData(data) {
    return await setStorageValue(CACHE_KEY, data);
}

async function refreshStats() {
    try {
        const data = await loadCacheData();
        const count = Object.keys(data).length;
        document.getElementById('hg-cache-entries').textContent =
            count.toLocaleString();
    } catch {
        document.getElementById('hg-cache-entries').textContent = 'error';
    }
}

async function handleExport() {
    try {
        showStatus('Exporting…');
        const data = await loadCacheData();
        const json = JSON.stringify(data);
        const blob = new Blob([json], { type: 'application/json' });

        const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
        const compressedBlob = await new Response(stream).blob();

        const url = URL.createObjectURL(compressedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hypergravity-tokens-${Date.now()}.gz`;
        a.click();
        URL.revokeObjectURL(url);

        showStatus(`Exported ${Object.keys(data).length} entries`, 'success');
    } catch (err) {
        showStatus(`Export failed: ${err.message}`, 'error');
    }
}

async function handleImport(file) {
    try {
        showStatus('Importing…');
        const stream = file
            .stream()
            .pipeThrough(new DecompressionStream('gzip'));
        const text = await new Response(stream).text();
        const importedData = JSON.parse(text);

        if (!importedData || typeof importedData !== 'object') {
            throw new Error('Invalid data format');
        }

        const existing = await loadCacheData();
        let imported = 0;

        for (const [hash, count] of Object.entries(importedData)) {
            if (typeof hash === 'string' && Number.isFinite(count)) {
                existing[hash] = count;
                imported++;
            }
        }

        await saveCacheData(existing);
        await refreshStats();

        showStatus(`Imported ${imported} entries`, 'success');
    } catch (err) {
        showStatus(`Import failed: ${err.message}`, 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('hg-version').textContent = `v${getVersion()}`;

    refreshStats();

    document
        .getElementById('hg-export-btn')
        .addEventListener('click', handleExport);

    const importInput = document.getElementById('hg-import-input');
    document.getElementById('hg-import-btn').addEventListener('click', () => {
        importInput.click();
    });

    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImport(file);
            importInput.value = '';
        }
    });

    // initialize enable/disable toggle
    const enableToggle = document.getElementById('hg-enabled-toggle');
    if (enableToggle) {
        (async () => {
            const settings = await getStorageValue(SETTINGS_KEY, DEFAULT_SETTINGS);
            enableToggle.checked = Boolean(settings.enabled);
        })();

        enableToggle.addEventListener('change', async () => {
            const current = await getStorageValue(SETTINGS_KEY, DEFAULT_SETTINGS);
            const newSettings = { ...current, enabled: enableToggle.checked };
            await setStorageValue(SETTINGS_KEY, newSettings);
            showStatus(
                `Hypergravity ${enableToggle.checked ? 'enabled' : 'disabled'}`,
                'info'
            );
            // ask the user about reloading to apply change
            const reload = window.confirm(
                'Changes will take effect after reloading the current tab. Reload now?'
            );
            if (reload) {
                chrome.tabs.query(
                    { active: true, currentWindow: true },
                    (tabs) => {
                        if (tabs[0] && tabs[0].id) {
                            chrome.tabs.reload(tabs[0].id);
                        }
                    }
                );
            }
        });
    }
});
