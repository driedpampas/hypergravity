export function hasChromeStorage() {
    return (
        typeof chrome !== 'undefined' &&
        chrome.storage &&
        chrome.storage.local &&
        typeof chrome.storage.local.get === 'function' &&
        typeof chrome.storage.local.set === 'function'
    );
}

export function readLocalStorageValue(key) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return undefined;
        return JSON.parse(raw);
    } catch {
        return undefined;
    }
}

export function writeLocalStorageValue(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // quota exceeded or private mode
    }
}
