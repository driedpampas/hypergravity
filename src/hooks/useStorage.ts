import { addStorageListener, getStorageValue, setStorageValue } from '@utils/browserEnv';
import { useEffect, useRef, useState } from 'preact/hooks';

type PlainObject = Record<string, unknown>;

/**
 * Deep merge a stored object with default object values.
 * @param {Object} stored - The values retrieved from storage.
 * @param {Object} defaults - The fallback/default values.
 * @returns {Object}
 */
function mergeWithDefaults<T>(stored: T, defaults: T): T {
    if (
        defaults &&
        typeof defaults === 'object' &&
        !Array.isArray(defaults) &&
        stored &&
        typeof stored === 'object' &&
        !Array.isArray(stored)
    ) {
        return {
            ...(defaults as PlainObject),
            ...(stored as PlainObject),
        } as T;
    }
    return stored;
}

/**
 * Preact/React hook for persisting state to async storage backends.
 * Automatically synchronizes state changes across different tabs or extension components.
 * @param {string} key - The storage key.
 * @param {*} initialValue - The initial/default value.
 * @returns {[*, Function, boolean]} State value, setter function, and loaded status.
 */
export function useStorage<T>(key: string, initialValue: T): [T, (newValue: T) => void, boolean] {
    const [value, setValue] = useState(initialValue);
    const [isLoaded, setIsLoaded] = useState(false);
    const defaultsRef = useRef(initialValue);

    useEffect(() => {
        let isMounted = true;
        let unsubscribe: (() => void) | null = null;

        getStorageValue<T>(key).then((storedValue) => {
            if (!isMounted) return;
            const merged = mergeWithDefaults(
                (storedValue !== undefined ? storedValue : initialValue) as T,
                defaultsRef.current
            );
            setValue(merged);
            setIsLoaded(true);
        });

        // Listen for external changes
        unsubscribe = addStorageListener(key, (newValue) => {
            if (!isMounted) return;
            if (newValue !== undefined) {
                const merged = mergeWithDefaults<T>(newValue as T, defaultsRef.current);
                setValue(merged);
            }
        });

        return () => {
            isMounted = false;
            if (unsubscribe) unsubscribe();
        };
    }, [key, initialValue]);

    const setStoredValue = (newValue: T) => {
        setValue(newValue);
        void setStorageValue(key, newValue);
    };

    return [value, setStoredValue, isLoaded];
}
