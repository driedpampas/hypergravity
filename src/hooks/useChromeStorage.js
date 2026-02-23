import { useEffect, useState, useRef } from 'react';
import {
    hasChromeStorage,
    readLocalStorageValue,
    writeLocalStorageValue,
} from '../utils/storage';

function mergeWithDefaults(stored, defaults) {
    if (
        defaults &&
        typeof defaults === 'object' &&
        !Array.isArray(defaults) &&
        stored &&
        typeof stored === 'object' &&
        !Array.isArray(stored)
    ) {
        return { ...defaults, ...stored };
    }
    return stored;
}

export function useChromeStorage(key, initialValue) {
    const [value, setValue] = useState(initialValue);
    const [isLoaded, setIsLoaded] = useState(false);
    const defaultsRef = useRef(initialValue);

    useEffect(() => {
        if (hasChromeStorage()) {
            chrome.storage.local.get([key], (result) => {
                if (result[key] !== undefined) {
                    const merged = mergeWithDefaults(
                        result[key],
                        defaultsRef.current
                    );
                    setValue(merged);
                    writeLocalStorageValue(key, merged);
                } else {
                    const localValue = readLocalStorageValue(key);
                    if (localValue !== undefined) {
                        const merged = mergeWithDefaults(
                            localValue,
                            defaultsRef.current
                        );
                        setValue(merged);
                        chrome.storage.local.set({ [key]: merged });
                    }
                }
                setIsLoaded(true);
            });

            const handleChange = (changes, areaName) => {
                if (areaName !== 'local') return;
                if (changes[key] && changes[key].newValue !== undefined) {
                    const merged = mergeWithDefaults(
                        changes[key].newValue,
                        defaultsRef.current
                    );
                    setValue(merged);
                    writeLocalStorageValue(key, merged);
                }
            };

            chrome.storage.onChanged.addListener(handleChange);
            return () => chrome.storage.onChanged.removeListener(handleChange);
        } else {
            const localValue = readLocalStorageValue(key);
            if (localValue !== undefined) {
                const merged = mergeWithDefaults(
                    localValue,
                    defaultsRef.current
                );
                setValue(merged);
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
