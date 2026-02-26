import {
    getAllIdbValues,
    getIdbValue,
    getIdbValues,
    removeIdbValue,
    setIdbValue,
    setIdbValues,
} from '@utils/idbStorage';

type StorageListener = (value: unknown) => void;

const localListeners = new Map<string, Set<StorageListener>>();
const storageContextId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const storageChannel =
    typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel('hypergravity-storage-events')
        : null;

function emitToLocalListeners(key: string, value: unknown): void {
    const listeners = localListeners.get(key);
    if (!listeners || listeners.size === 0) return;
    for (const listener of listeners) {
        try {
            listener(value);
        } catch (e) {
            // no-op
        }
    }
}

function notifyStorageChange(key: string, value: unknown): void {
    emitToLocalListeners(key, value);

    if (storageChannel) {
        try {
            storageChannel.postMessage({
                source: storageContextId,
                key,
                value,
            });
        } catch {}
    }
}

if (storageChannel) {
    storageChannel.onmessage = (event: MessageEvent) => {
        const payload = event?.data as
            | { source?: string; key?: string; value?: unknown }
            | undefined;
        if (!payload || payload.source === storageContextId) return;
        if (!payload.key) return;
        emitToLocalListeners(payload.key, payload.value);
    };
}

/**
 * Checks if the current environment is a Chrome/Web Extension.
 * @returns {boolean}
 */
export function isExtension() {
    return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
}

/**
 * Checks if the current environment is a Userscript manager (e.g. Tampermonkey).
 * @returns {boolean}
 */
export function isUserscript() {
    return typeof GM_info !== 'undefined';
}

/**
 * Verifies if the Chrome storage API is available and usable.
 * @returns {boolean}
 */
export function hasChromeStorage() {
    return (
        typeof chrome !== 'undefined' &&
        chrome.storage &&
        chrome.storage.local &&
        typeof chrome.storage.local.get === 'function' &&
        typeof chrome.storage.local.set === 'function'
    );
}

/**
 * Retrieves the version string from the manifest or userscript metadata.
 * @returns {string}
 */
export function getVersion() {
    if (isExtension() && chrome.runtime.getManifest) {
        return chrome.runtime.getManifest().version;
    }
    if (isUserscript() && GM_info && GM_info.script) {
        return GM_info.script.version;
    }
    return '1.0.0';
}

/**
 * Core storage retrieval function that abstracts over chrome.storage, userscript storage, and IndexedDB.
 * Prioritizes chrome.storage and keeps IndexedDB in sync as a backup.
 * @param {string} key
 * @param {*} [fallback=undefined]
 * @returns {Promise<*>}
 */
export async function getStorageValue<T = unknown>(
    key: string,
    fallback: T = undefined as T
): Promise<T | unknown> {
    if (hasChromeStorage()) {
        const chromeValue = await new Promise<unknown>((resolve) => {
            chrome.storage.local.get([key], (result) => {
                if (chrome.runtime?.lastError) {
                    resolve(undefined);
                    return;
                }
                resolve(result[key]);
            });
        });

        if (chromeValue !== undefined) {
            await setIdbValue(key, chromeValue);
            return chromeValue;
        }

        const idbValue = await getIdbValue(key, undefined);
        if (idbValue !== undefined) {
            chrome.storage.local.set({ [key]: idbValue }, () => {});
            return idbValue;
        }

        return fallback;
    }

    if (isUserscript() && typeof GM_getValue === 'function') {
        const val = await GM_getValue(key, fallback);
        await setIdbValue(key, val);
        return val;
    }

    return getIdbValue(key, fallback);
}

/**
 * Core storage persistence function that synchronizes value across available storage backends.
 * @param {string} key
 * @param {*} value
 * @returns {Promise<void>}
 */
export async function setStorageValue(key: string, value: unknown): Promise<void> {
    await setIdbValue(key, value);

    if (hasChromeStorage()) {
        return new Promise<void>((resolve) => {
            chrome.storage.local.set({ [key]: value }, () => resolve());
        });
    }

    if (isUserscript() && typeof GM_setValue === 'function') {
        await GM_setValue(key, value);
        return Promise.resolve();
    }

    notifyStorageChange(key, value);
    return Promise.resolve();
}

/**
 * Core storage removal function that removes value from all available storage backends.
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function removeStorageValue(key: string): Promise<void> {
    await removeIdbValue(key);

    if (hasChromeStorage()) {
        return new Promise<void>((resolve) => {
            chrome.storage.local.remove([key], () => resolve());
        });
    }

    if (isUserscript() && typeof GM_deleteValue === 'function') {
        await GM_deleteValue(key);
        return Promise.resolve();
    }

    notifyStorageChange(key, undefined);
    return Promise.resolve();
}

export function addStorageListener(key: string, callback: StorageListener): () => void {
    if (hasChromeStorage()) {
        const listener = (
            changes: Record<string, chrome.storage.StorageChange>,
            areaName: string
        ) => {
            if (areaName === 'local' && changes[key]) {
                callback(changes[key].newValue);
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }

    if (isUserscript() && typeof GM_addValueChangeListener === 'function') {
        const listenerId = GM_addValueChangeListener(key, (_name, _oldValue, newValue, _remote) => {
            callback(newValue);
        });
        return () => GM_removeValueChangeListener(listenerId);
    }

    const listeners = localListeners.get(key) || new Set();
    listeners.add(callback);
    localListeners.set(key, listeners);

    return () => {
        const current = localListeners.get(key);
        if (!current) return;
        current.delete(callback);
        if (current.size === 0) {
            localListeners.delete(key);
        }
    };
}

export async function getAllStorageData(keys?: string[]): Promise<Record<string, unknown>> {
    if (hasChromeStorage()) {
        return new Promise<Record<string, unknown>>((resolve) => {
            chrome.storage.local.get(keys ?? null, async (result) => {
                if (chrome.runtime?.lastError) {
                    if (Array.isArray(keys)) {
                        resolve((await getIdbValues(keys)) as Record<string, unknown>);
                        return;
                    }
                    resolve(await getAllIdbValues());
                    return;
                }
                if (result && typeof result === 'object') {
                    await setIdbValues(result as Record<string, unknown>);
                }
                resolve((result || {}) as Record<string, unknown>);
            });
        });
    }

    if (isUserscript() && typeof GM_getValue === 'function') {
        const result: Record<string, unknown> = {};
        if (Array.isArray(keys)) {
            for (const key of keys) {
                result[key] = await GM_getValue(key);
            }
            await setIdbValues(result);
            return result;
        }

        if (typeof GM_listValues === 'function') {
            const listedKeys = await GM_listValues();
            for (const key of listedKeys) {
                result[key] = await GM_getValue(key);
            }
            await setIdbValues(result);
            return result;
        }
    }

    if (Array.isArray(keys)) {
        return getIdbValues(keys);
    }

    return getAllIdbValues();
}

// Prompt Optimizer
export async function optimizePrompt(promptText: string): Promise<unknown> {
    if (isExtension()) {
        return chrome.runtime.sendMessage({
            type: 'OPTIMIZE_PROMPT',
            prompt: promptText,
        });
    }

    if (isUserscript() && typeof GM_openInTab === 'function') {
        const requestId = Date.now().toString() + Math.random().toString().slice(2);

        return new Promise<unknown>((resolve, reject) => {
            // Setup listener for the result
            const listenerId = GM_addValueChangeListener(
                `hg_opt_result_${requestId}`,
                (_name, _oldValue, newValue) => {
                    if (newValue) {
                        GM_removeValueChangeListener(listenerId);
                        GM_deleteValue(`hg_opt_result_${requestId}`);
                        resolve(newValue);
                    }
                }
            );

            // Set the request payload
            GM_setValue(`hg_opt_req_${requestId}`, { prompt: promptText });

            // Open gemini in a background tab with a hash to trigger worker mode
            GM_openInTab(`https://gemini.google.com/app#hg_worker=${requestId}`, {
                active: false,
                insert: true,
            });

            // Timeout
            setTimeout(() => {
                GM_removeValueChangeListener(listenerId);
                reject(new Error('Optimization timeout in Userscript'));
            }, 60000);
        });
    }

    throw new Error('Optimize prompt not supported in this environment');
}

export async function cancelOptimization() {
    if (isExtension()) {
        chrome.runtime.sendMessage({ type: 'CANCEL_OPTIMIZATION' });
    }
}

export async function summarizeChatMemory(payload: Record<string, unknown>): Promise<unknown> {
    if (isExtension()) {
        return chrome.runtime.sendMessage({
            type: 'SUMMARIZE_CHAT_MEMORY',
            ...payload,
        });
    }

    throw new Error('Chat memory summarization is not supported here');
}
