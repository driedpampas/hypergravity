import {
    getIdbValue,
    setIdbValue,
    removeIdbValue,
    setIdbValues,
    getIdbValues,
    getAllIdbValues,
} from './idbStorage';

const localListeners = new Map();
const storageContextId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const storageChannel =
    typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel('hypergravity-storage-events')
        : null;

function emitToLocalListeners(key, value) {
    const listeners = localListeners.get(key);
    if (!listeners || listeners.size === 0) return;
    listeners.forEach((listener) => {
        try {
            listener(value);
        } catch {}
    });
}

function notifyStorageChange(key, value) {
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
    storageChannel.onmessage = (event) => {
        const payload = event?.data;
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
    return (
        typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id
    );
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
export async function getStorageValue(key, fallback = undefined) {
    if (hasChromeStorage()) {
        const chromeValue = await new Promise((resolve) => {
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
        const val = GM_getValue(key, fallback);
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
export async function setStorageValue(key, value) {
    await setIdbValue(key, value);

    if (hasChromeStorage()) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [key]: value }, () => resolve());
        });
    }

    if (isUserscript() && typeof GM_setValue === 'function') {
        GM_setValue(key, value);
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
export async function removeStorageValue(key) {
    await removeIdbValue(key);

    if (hasChromeStorage()) {
        return new Promise((resolve) => {
            chrome.storage.local.remove([key], () => resolve());
        });
    }

    if (isUserscript() && typeof GM_deleteValue === 'function') {
        GM_deleteValue(key);
        return Promise.resolve();
    }

    notifyStorageChange(key, undefined);
    return Promise.resolve();
}

export function addStorageListener(key, callback) {
    if (hasChromeStorage()) {
        const listener = (changes, areaName) => {
            if (areaName === 'local' && changes[key]) {
                callback(changes[key].newValue);
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }

    if (isUserscript() && typeof GM_addValueChangeListener === 'function') {
        const listenerId = GM_addValueChangeListener(
            key,
            (name, old_value, new_value, remote) => {
                callback(new_value);
            }
        );
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

export async function getAllStorageData(keys) {
    if (hasChromeStorage()) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, async (result) => {
                if (chrome.runtime?.lastError) {
                    if (Array.isArray(keys)) {
                        resolve(await getIdbValues(keys));
                        return;
                    }
                    resolve(await getAllIdbValues());
                    return;
                }
                if (result && typeof result === 'object') {
                    await setIdbValues(result);
                }
                resolve(result || {});
            });
        });
    }

    if (isUserscript() && typeof GM_getValue === 'function') {
        const result = {};
        if (Array.isArray(keys)) {
            for (const key of keys) {
                result[key] = GM_getValue(key);
            }
            await setIdbValues(result);
            return result;
        }

        if (typeof GM_listValues === 'function') {
            for (const key of GM_listValues()) {
                result[key] = GM_getValue(key);
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
export async function optimizePrompt(promptText) {
    if (isExtension()) {
        return chrome.runtime.sendMessage({
            type: 'OPTIMIZE_PROMPT',
            prompt: promptText,
        });
    }

    if (isUserscript() && typeof GM_openInTab === 'function') {
        const requestId =
            Date.now().toString() + Math.random().toString().slice(2);

        return new Promise((resolve, reject) => {
            // Setup listener for the result
            const listenerId = GM_addValueChangeListener(
                `hg_opt_result_${requestId}`,
                (name, old_value, new_value) => {
                    if (new_value) {
                        GM_removeValueChangeListener(listenerId);
                        GM_deleteValue(`hg_opt_result_${requestId}`);
                        resolve(new_value);
                    }
                }
            );

            // Set the request payload
            GM_setValue(`hg_opt_req_${requestId}`, { prompt: promptText });

            // Open gemini in a background tab with a hash to trigger worker mode
            GM_openInTab(
                `https://gemini.google.com/app#hg_worker=${requestId}`,
                { active: false, insert: true }
            );

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

export async function summarizeChatMemory(payload) {
    if (isExtension()) {
        return chrome.runtime.sendMessage({
            type: 'SUMMARIZE_CHAT_MEMORY',
            ...payload,
        });
    }

    throw new Error('Chat memory summarization is not supported here');
}
