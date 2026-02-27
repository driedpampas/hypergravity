import { ExportDataIcon, ImportDataIcon } from '@icons';
import {
    TOKEN_CACHE_MESSAGE_TYPES,
    type TokenCacheMessage,
    type TokenCacheResponse,
} from '@shared/contracts/tokenCacheMessages';
import { getStorageValue, getVersion, setStorageValue } from '@utils/browserEnv';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '@utils/constants';
import { clearCacheData, getAllCacheData, importCacheData } from '@utils/tokenHashCache';
import { h, render } from 'preact';

type PopupSettings = typeof DEFAULT_SETTINGS;

function showStatus(message: string, type = '') {
    const el = document.getElementById('hg-status');
    if (!el) return;
    el.textContent = message;
    el.className = `hg-popup-status${type ? ` ${type}` : ''}`;
    if (type) {
        setTimeout(() => {
            el.textContent = '';
            el.className = 'hg-popup-status';
        }, 3000);
    }
}

async function sendCacheMessageToActiveGeminiTab(
    message: TokenCacheMessage
): Promise<TokenCacheResponse | null> {
    const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
    });

    if (!activeTab?.id) return null;
    if (!activeTab.url?.startsWith('https://gemini.google.com/')) return null;

    try {
        return (await chrome.tabs.sendMessage(activeTab.id, message)) as TokenCacheResponse;
    } catch {
        return null;
    }
}

async function getSyncedCacheData() {
    const localData = await getAllCacheData();
    const tabResponse = await sendCacheMessageToActiveGeminiTab({
        type: TOKEN_CACHE_MESSAGE_TYPES.getAll,
    });
    const tabData = tabResponse?.success && tabResponse.data ? tabResponse.data : null;

    if (tabData && typeof tabData === 'object') {
        await importCacheData(tabData);
    }

    return { ...(localData || {}), ...(tabData || {}) };
}

async function loadCacheData() {
    return await getSyncedCacheData();
}

async function refreshStats() {
    const statEl = document.getElementById('hg-cache-entries');
    if (!statEl) return;
    try {
        const merged = await getSyncedCacheData();
        const entries = Object.keys(merged).length;
        statEl.textContent = entries.toLocaleString();
    } catch {
        statEl.textContent = 'error';
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
        const message = err instanceof Error ? err.message : 'Unknown error';
        showStatus(`Export failed: ${message}`, 'error');
    }
}

async function handleImport(file: File) {
    try {
        showStatus('Importing…');
        const stream = file.stream().pipeThrough(new DecompressionStream('gzip'));
        const text = await new Response(stream).text();
        const importedData = JSON.parse(text);

        if (!importedData || typeof importedData !== 'object') {
            throw new Error('Invalid data format');
        }

        const imported = await importCacheData(importedData);
        await sendCacheMessageToActiveGeminiTab({
            type: TOKEN_CACHE_MESSAGE_TYPES.import,
            data: importedData,
        });
        await refreshStats();

        showStatus(`Imported ${imported} entries`, 'success');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        showStatus(`Import failed: ${message}`, 'error');
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
}: {
    title: string;
    body: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
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

    return new Promise<boolean>((resolve) => {
        overlay.classList.add('active');

        const close = (confirmed: boolean) => {
            overlay.classList.remove('active');
            cancelBtn.removeEventListener('click', onCancel);
            confirmBtn.removeEventListener('click', onConfirm);
            overlay.removeEventListener('click', onOverlayClick);
            resolve(confirmed);
        };

        const onCancel = () => close(false);
        const onConfirm = () => close(true);
        const onOverlayClick = (event: MouseEvent) => {
            if (event.target === overlay) close(false);
        };

        cancelBtn.addEventListener('click', onCancel);
        confirmBtn.addEventListener('click', onConfirm);
        overlay.addEventListener('click', onOverlayClick);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    mountIcons();
    const versionEl = document.getElementById('hg-version');
    if (versionEl) {
        versionEl.textContent = `v${getVersion()}`;
    }

    refreshStats();

    document.getElementById('hg-export-btn')?.addEventListener('click', handleExport);

    const importInput = document.getElementById('hg-import-input') as HTMLInputElement | null;
    document.getElementById('hg-import-btn')?.addEventListener('click', () => {
        importInput?.click();
    });

    document.getElementById('hg-clear-cache-btn')?.addEventListener('click', async () => {
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
            type: TOKEN_CACHE_MESSAGE_TYPES.clear,
        });
        await refreshStats();
        showStatus(`Cleared ${cleared} entries`, 'success');
    });

    importInput?.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement | null;
        const file = target?.files?.[0];
        if (file) {
            handleImport(file);
            if (importInput) importInput.value = '';
        }
    });

    // initialize enable/disable toggle
    const enableToggle = document.getElementById('hg-enabled-toggle') as HTMLInputElement | null;
    const toggleUi = document.getElementById('hg-toggle-ui') as HTMLElement | null;
    const enabledRow = document.getElementById('hg-enabled-row');

    if (enableToggle && toggleUi) {
        (async () => {
            const settings = (await getStorageValue(
                SETTINGS_KEY,
                DEFAULT_SETTINGS
            )) as PopupSettings;
            enableToggle.checked = Boolean(settings.enabled);
            toggleUi.classList.toggle('active', enableToggle.checked);
        })();

        const onChange = async () => {
            const current = (await getStorageValue(
                SETTINGS_KEY,
                DEFAULT_SETTINGS
            )) as PopupSettings;
            const isChecked = !current.enabled; // toggle state

            enableToggle.checked = isChecked;
            toggleUi.classList.toggle('active', isChecked);

            const newSettings = { ...current, enabled: isChecked };
            await setStorageValue(SETTINGS_KEY, newSettings);

            showStatus(`Hypergravity ${isChecked ? 'enabled' : 'disabled'}`, 'info');

            const confirmed = await showConfirmModal({
                title: 'Reload Required',
                body: 'Changes will take effect after reloading the current tab.',
                confirmText: 'Reload Now',
                cancelText: 'Later',
            });

            if (confirmed) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.id) {
                        chrome.tabs.reload(tabs[0].id);
                    }
                });
            }
        };

        // Clicking the row or the toggle UI should flip it
        enabledRow?.addEventListener('click', (e: Event) => {
            // prevent double-triggering if we clicked a child
            e.preventDefault();
            onChange();
        });
    }
});
