import { useEffect, useState, useRef } from 'preact/hooks';
import {
    getStorageValue,
    setStorageValue,
    addStorageListener,
    writeLocalStorageValue,
} from '../utils/browserEnv';

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
        let isMounted = true;
        let unsubscribe = null;

        getStorageValue(key).then((storedValue) => {
            if (!isMounted) return;
            const merged = mergeWithDefaults(
                storedValue !== undefined ? storedValue : initialValue,
                defaultsRef.current
            );
            setValue(merged);
            setIsLoaded(true);
        });

        // Listen for external changes
        unsubscribe = addStorageListener(key, (newValue) => {
            if (!isMounted) return;
            if (newValue !== undefined) {
                const merged = mergeWithDefaults(newValue, defaultsRef.current);
                setValue(merged);
                // keep local storage in sync as fallback
                writeLocalStorageValue(key, merged);
            }
        });

        return () => {
            isMounted = false;
            if (unsubscribe) unsubscribe();
        };
    }, [key, initialValue]);

    const setStoredValue = (newValue) => {
        setValue(newValue);
        setStorageValue(key, newValue);
    };

    return [value, setStoredValue, isLoaded];
}
