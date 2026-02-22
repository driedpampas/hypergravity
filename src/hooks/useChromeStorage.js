import { useEffect, useState } from 'react';

export function useChromeStorage(key, initialValue) {
    const [value, setValue] = useState(initialValue);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Check if chrome.storage is available (only in extension context)
        if (
            typeof chrome !== 'undefined' &&
            chrome.storage &&
            chrome.storage.local
        ) {
            chrome.storage.local.get([key], (result) => {
                if (result[key] !== undefined) {
                    setValue(result[key]);
                }
                setIsLoaded(true);
            });
        } else {
            // Fallback or dev mode
            setIsLoaded(true);
        }
    }, [key]);

    const setStoredValue = (newValue) => {
        setValue(newValue);
        if (
            typeof chrome !== 'undefined' &&
            chrome.storage &&
            chrome.storage.local
        ) {
            chrome.storage.local.set({ [key]: newValue });
        }
    };

    return [value, setStoredValue, isLoaded];
}
