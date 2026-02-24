import { getStorageValue, setStorageValue } from './browserEnv';
import { debugLog as _debugLog } from './debug';

const CACHE_KEY = 'hg_token_hash_cache';
const FLUSH_DELAY = 1500;

let memoryCache = null;
let flushTimer = null;
let loadPromise = null;
let dirty = false;

const debugLog = (...args) => _debugLog('Cache', ...args);

/**
 * Ensures the in-memory cache is populated from persistent storage.
 * @returns {Promise<Object>} The cache data object.
 */
function loadCache() {
    if (loadPromise) return loadPromise;

    loadPromise = new Promise((resolve) => {
        getStorageValue(CACHE_KEY, {}).then((data) => {
            memoryCache = data || {};
            debugLog(
                'Cache loaded,',
                Object.keys(memoryCache).length,
                'entries'
            );
            resolve(memoryCache);
        });
    });

    return loadPromise;
}

/**
 * Persists the current in-memory cache state back to storage.
 */
function flushToStorage() {
    if (!memoryCache || !dirty) return;
    dirty = false;

    const data = { ...memoryCache };
    debugLog('Flushing', Object.keys(data).length, 'entries to storage');

    setStorageValue(CACHE_KEY, data);
}

/**
 * Debounces cache writes to storage to prevent excessive API calls.
 */
function scheduleFlush() {
    dirty = true;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flushToStorage, FLUSH_DELAY);
}

try {
    window.addEventListener('beforeunload', flushToStorage);
} catch {
    // not in a window context
}

const USER_PREFIXES = [/^You said\n\n/, /^You said\n/];

const MODEL_PREFIXES = [
    /^Show thinking\nGemini said\n\n/,
    /^Show thinking\nGemini said\n/,
    /^Gemini said\n\n/,
    /^Gemini said\n/,
];

/**
 * Strips Gemini's UI boilerplate text from message content to improve token counting accuracy.
 * @param {string} text - Raw message text.
 * @param {'input'|'output'} role - The source of the message.
 * @returns {string} Cleaned text.
 */
export function sanitizeMessageText(text, role) {
    if (!text) return '';
    let cleaned = text;
    const prefixes = role === 'input' ? USER_PREFIXES : MODEL_PREFIXES;
    for (const prefix of prefixes) {
        cleaned = cleaned.replace(prefix, '');
        if (cleaned !== text) break;
    }
    return cleaned.trim();
}

/**
 * Generates a stable, short cryptographic hash for a block of text.
 * Used as a cache key for token counts.
 * @param {string} text 
 * @returns {Promise<string>} Hexadecimal hash string.
 */
export async function hashText(text) {
    const normalized = (text || '').replace(/\s+/g, ' ').trim();
    const encoded = new TextEncoder().encode(normalized);
    const buffer = await crypto.subtle.digest('SHA-256', encoded);
    const bytes = new Uint8Array(buffer);
    let hex = '';
    for (let i = 0; i < 8; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}

/**
 * Look up a cached token count by its text hash.
 * @param {string} hash - The SHA-256 hash of the text.
 * @returns {Promise<number|null>}
 */
export async function getCachedTokenCount(hash) {
    const cache = await loadCache();
    const value = cache[hash];
    const result = Number.isFinite(value) ? value : null;
    debugLog(
        result !== null ? `Cache HIT ${hash} → ${result}` : `Cache MISS ${hash}`
    );
    return result;
}

/**
 * Store a token count in the cache for a given text hash.
 * @param {string} hash 
 * @param {number} count 
 */
export async function setCachedTokenCount(hash, count) {
    const cache = await loadCache();
    cache[hash] = count;
    debugLog(`Cache SET ${hash} → ${count}`);
    scheduleFlush();
}

export function forceFlush() {
    flushToStorage();
}

export async function getAllCacheData() {
    const cache = await loadCache();
    return { ...cache };
}

export async function importCacheData(data) {
    if (!data || typeof data !== 'object') return 0;
    const cache = await loadCache();
    let imported = 0;
    for (const [hash, count] of Object.entries(data)) {
        if (typeof hash === 'string' && Number.isFinite(count)) {
            cache[hash] = count;
            imported++;
        }
    }
    dirty = true;
    flushToStorage();
    return imported;
}

export async function getCacheStats() {
    const cache = await loadCache();
    const entries = Object.keys(cache).length;
    return { entries };
}
