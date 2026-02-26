import { h, render } from 'preact';
import {
    getStorageValue,
    setStorageValue,
    getVersion,
} from '@utils/browserEnv';
import { ExportDataIcon, ImportDataIcon } from '@icons';
import { SETTINGS_KEY, DEFAULT_SETTINGS } from '@utils/constants';
import {
    getAllCacheData,
    importCacheData,
    getCacheStats,
    clearCacheData,
} from '@utils/tokenHashCache';

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

async function sendCacheMessageToActiveGeminiTab(message) {
    const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
    });

    if (!activeTab?.id) return null;
    if (!activeTab.url?.startsWith('https://gemini.google.com/')) return null;

    try {
        return await chrome.tabs.sendMessage(activeTab.id, message);
    } catch {
        return null;
    }
}

async function getSyncedCacheData() {
    const localData = await getAllCacheData();
    const tabResponse = await sendCacheMessageToActiveGeminiTab({
        type: 'HG_TOKEN_CACHE_GET_ALL',
    });
    const tabData =
        tabResponse?.success && tabResponse.data ? tabResponse.data : null;

    if (tabData && typeof tabData === 'object') {
        await importCacheData(tabData);
    }

    return { ...(localData || {}), ...(tabData || {}) };
}

async function loadCacheData() {
    return await getSyncedCacheData();
}

async function refreshStats() {
    try {
        const merged = await getSyncedCacheData();
        const entries = Object.keys(merged).length;
        document.getElementById('hg-cache-entries').textContent =
            entries.toLocaleString();
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

        const imported = await importCacheData(importedData);
        await sendCacheMessageToActiveGeminiTab({
            type: 'HG_TOKEN_CACHE_IMPORT',
            data: importedData,
        });
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

function showConfirmModal({
    title,
    body,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false,
}) {
    const overlay = document.getElementById('hg-modal-overlay');
    const titleEl = overlay?.querySelector('.hg-popup-modal-title');
    const bodyEl = document.getElementById('hg-modal-body');
    const cancelBtn = document.getElementById('hg-modal-cancel');
    const confirmBtn = document.getElementById('hg-modal-confirm');

    if (!overlay || !titleEl || !bodyEl || !cancelBtn || !confirmBtn) {
        return Promise.resolve(false);
    }

    titleEl.textContent = title;
    bodyEl.textContent = body;
    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;
    confirmBtn.classList.toggle('hg-popup-modal-btn--danger', danger);
    confirmBtn.classList.toggle('hg-popup-modal-btn--primary', !danger);

    return new Promise((resolve) => {
        overlay.classList.add('active');

        const close = (confirmed) => {
            overlay.classList.remove('active');
            cancelBtn.removeEventListener('click', onCancel);
            confirmBtn.removeEventListener('click', onConfirm);
            overlay.removeEventListener('click', onOverlayClick);
            resolve(confirmed);
        };

        const onCancel = () => close(false);
        const onConfirm = () => close(true);
        const onOverlayClick = (event) => {
            if (event.target === overlay) close(false);
        };

        cancelBtn.addEventListener('click', onCancel);
        confirmBtn.addEventListener('click', onConfirm);
        overlay.addEventListener('click', onOverlayClick);
    });
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

    document
        .getElementById('hg-clear-cache-btn')
        .addEventListener('click', async () => {
            const merged = await getSyncedCacheData();
            const entries = Object.keys(merged).length;
            if (!entries) {
                showStatus('Cache is already empty', 'info');
                return;
            }

            const confirmed = await showConfirmModal({
                title: 'Clear Cached Token Counts?',
                body: 'This permanently deletes all cached token counts and cannot be undone.',
                confirmText: 'Clear Cache',
                cancelText: 'Cancel',
                danger: true,
            });

            if (!confirmed) return;

            showStatus('Clearing cache…');
            const cleared = await clearCacheData();
            await sendCacheMessageToActiveGeminiTab({
                type: 'HG_TOKEN_CACHE_CLEAR',
            });
            await refreshStats();
            showStatus(`Cleared ${cleared} entries`, 'success');
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

            const confirmed = await showConfirmModal({
                title: 'Reload Required',
                body: 'Changes will take effect after reloading the current tab.',
                confirmText: 'Reload Now',
                cancelText: 'Later',
            });

            if (confirmed) {
                chrome.tabs.query(
                    { active: true, currentWindow: true },
                    (tabs) => {
                        if (tabs[0] && tabs[0].id) {
                            chrome.tabs.reload(tabs[0].id);
                        }
                    }
                );
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
