import { useEffect, useState } from 'react';

function hasChromeStorage() {
    return (
        typeof chrome !== 'undefined' &&
        chrome.storage &&
        chrome.storage.local
    );
}

function readLocalStorageValue(key) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return undefined;
        return JSON.parse(raw);
    } catch {
        return undefined;
    }
}

function writeLocalStorageValue(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage write failures (quota/private mode)
    }
}

export function useChromeStorage(key, initialValue) {
    const [value, setValue] = useState(initialValue);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (hasChromeStorage()) {
            chrome.storage.local.get([key], (result) => {
                if (result[key] !== undefined) {
                    setValue(result[key]);
                    writeLocalStorageValue(key, result[key]);
                } else {
                    const localValue = readLocalStorageValue(key);
                    if (localValue !== undefined) {
                        setValue(localValue);
                        chrome.storage.local.set({ [key]: localValue });
                    }
                }
                setIsLoaded(true);
            });
        } else {
            const localValue = readLocalStorageValue(key);
            if (localValue !== undefined) {
                setValue(localValue);
            }
            setIsLoaded(true);
        }
    }, [key]);

    const setStoredValue = (newValue) => {
        setValue(newValue);
        if (hasChromeStorage()) {
            chrome.storage.local.set({ [key]: newValue });
        }
        writeLocalStorageValue(key, newValue);
    };

    return [value, setStoredValue, isLoaded];
}
