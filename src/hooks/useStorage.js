import { useEffect, useState, useRef } from 'preact/hooks';
import {
    getStorageValue,
    setStorageValue,
    addStorageListener,
    writeLocalStorageValue,
} from '../utils/browserEnv';

/**
 * Deep merge a stored object with default object values.
 * @param {Object} stored - The values retrieved from storage.
 * @param {Object} defaults - The fallback/default values.
 * @returns {Object}
 */
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

/**
 * Preact/React hook for persisting state to Chrome Storage with localStorage fallback.
 * Automatically synchronizes state changes across different tabs or extension components.
 * @param {string} key - The storage key.
 * @param {*} initialValue - The initial/default value.
 * @returns {[*, Function, boolean]} State value, setter function, and loaded status.
 */
export function useStorage(key, initialValue) {
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
