import { h, render } from 'preact';
import {
    getStorageValue,
    setStorageValue,
    getVersion,
} from '../utils/browserEnv';
import { ExportDataIcon, ImportDataIcon } from '../icons';
import { SETTINGS_KEY, DEFAULT_SETTINGS } from '../utils/constants';

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

function mountIcons() {
    const exportIconRoot = document.getElementById('hg-export-icon');
    const importIconRoot = document.getElementById('hg-import-icon');

    if (exportIconRoot) {
        render(h(ExportDataIcon, null), exportIconRoot);
    }

    if (importIconRoot) {
        render(h(ImportDataIcon, null), importIconRoot);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    mountIcons();
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
    const toggleUi = document.getElementById('hg-toggle-ui');
    const enabledRow = document.getElementById('hg-enabled-row');

    if (enableToggle && toggleUi) {
        (async () => {
            const settings = await getStorageValue(
                SETTINGS_KEY,
                DEFAULT_SETTINGS
            );
            enableToggle.checked = Boolean(settings.enabled);
            toggleUi.classList.toggle('active', enableToggle.checked);
        })();

        const onChange = async () => {
            const current = await getStorageValue(
                SETTINGS_KEY,
                DEFAULT_SETTINGS
            );
            const isChecked = !current.enabled; // toggle state

            enableToggle.checked = isChecked;
            toggleUi.classList.toggle('active', isChecked);

            const newSettings = { ...current, enabled: isChecked };
            await setStorageValue(SETTINGS_KEY, newSettings);

            showStatus(
                `Hypergravity ${isChecked ? 'enabled' : 'disabled'}`,
                'info'
            );

            // show custom modal instead of window.confirm
            const overlay = document.getElementById('hg-modal-overlay');
            const cancelBtn = document.getElementById('hg-modal-cancel');
            const confirmBtn = document.getElementById('hg-modal-confirm');

            if (overlay && cancelBtn && confirmBtn) {
                overlay.classList.add('active');

                const close = () => {
                    overlay.classList.remove('active');
                    // clean up listeners
                    cancelBtn.removeEventListener('click', onCancel);
                    confirmBtn.removeEventListener('click', onConfirm);
                };

                const onCancel = () => close();
                const onConfirm = () => {
                    chrome.tabs.query(
                        { active: true, currentWindow: true },
                        (tabs) => {
                            if (tabs[0] && tabs[0].id) {
                                chrome.tabs.reload(tabs[0].id);
                            }
                        }
                    );
                    close();
                };

                cancelBtn.addEventListener('click', onCancel);
                confirmBtn.addEventListener('click', onConfirm);
            }
        };

        // Clicking the row or the toggle UI should flip it
        enabledRow.addEventListener('click', (e) => {
            // prevent double-triggering if we clicked a child
            e.preventDefault();
            onChange();
        });
    }
});
