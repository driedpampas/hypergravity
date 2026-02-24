import { debugLog } from './debug';

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
 * Reads a value from the synchronous localStorage, with fallback.
 * @param {string} key
 * @param {*} [fallback=undefined]
 * @returns {*}
 */
export function readLocalStorageValue(key, fallback = undefined) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

/**
 * Persists a value to localStorage, handling potential quota errors.
 * @param {string} key
 * @param {*} value
 */
export function writeLocalStorageValue(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // quota exceeded or private mode
    }
}

/**
 * Core storage retrieval function that abstracts over chrome.storage, userscript storage, and localStorage.
 * Prioritizes chrome.storage and keeps localStorage in sync as a backup.
 * @param {string} key
 * @param {*} [fallback=undefined]
 * @returns {Promise<*>}
 */
export async function getStorageValue(key, fallback = undefined) {
    return new Promise((resolve) => {
        if (hasChromeStorage()) {
            chrome.storage.local.get([key], (result) => {
                if (chrome.runtime?.lastError) {
                    resolve(readLocalStorageValue(key, fallback));
                    return;
                }
                if (result[key] !== undefined) {
                    writeLocalStorageValue(key, result[key]); // keep local in sync
                    resolve(result[key]);
                    return;
                }
                const localValue = readLocalStorageValue(key);
                if (localValue !== undefined) {
                    chrome.storage.local.set({ [key]: localValue }, () => {
                        resolve(localValue);
                    });
                    return;
                }
                resolve(fallback);
            });
            return;
        }

        if (isUserscript() && typeof GM_getValue === 'function') {
            const val = GM_getValue(key, fallback);
            writeLocalStorageValue(key, val);
            resolve(val);
            return;
        }

        resolve(readLocalStorageValue(key, fallback));
    });
}


/**
 * Core storage persistence function that synchronizes value across available storage backends.
 * @param {string} key
 * @param {*} value
 * @returns {Promise<void>}
 */
export async function setStorageValue(key, value) {
    writeLocalStorageValue(key, value);

    if (hasChromeStorage()) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [key]: value }, () => resolve());
        });
    }

    if (isUserscript() && typeof GM_setValue === 'function') {
        GM_setValue(key, value);
        return Promise.resolve();
    }

    return Promise.resolve();
}

/**
 * Core storage removal function that removes value from all available storage backends.
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function removeStorageValue(key) {
    try {
        localStorage.removeItem(key);
    } catch {}

    if (hasChromeStorage()) {
        return new Promise((resolve) => {
            chrome.storage.local.remove([key], () => resolve());
        });
    }

    if (isUserscript() && typeof GM_deleteValue === 'function') {
        GM_deleteValue(key);
        return Promise.resolve();
    }

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

    // Polling fallback for local storage if needed
    const interval = setInterval(() => {
        const val = readLocalStorageValue(key);
        callback(val);
    }, 1000);
    return () => clearInterval(interval);
}

export function getAllStorageData(keys) {
    return new Promise((resolve) => {
        if (hasChromeStorage()) {
            chrome.storage.local.get(keys, resolve);
            return;
        }

        let result = {};
        if (isUserscript() && typeof GM_getValue === 'function') {
            if (Array.isArray(keys)) {
                keys.forEach((k) => (result[k] = GM_getValue(k)));
            } else {
                // Userscripts don't have a clean way to get ALL keys unless we polyfill `GM_listValues`
                if (typeof GM_listValues === 'function') {
                    GM_listValues().forEach(
                        (k) => (result[k] = GM_getValue(k))
                    );
                }
            }
            resolve(result);
            return;
        }

        // fallback to localStorage
        resolve(result);
    });
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
