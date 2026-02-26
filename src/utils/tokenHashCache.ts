import { getStorageValue, removeStorageValue } from '@utils/browserEnv';
import { debugLog as _debugLog } from '@utils/debug';
import { getAllIdbValues, removeIdbValues, setIdbValues } from '@utils/idbStorage';

const CACHE_KEY = 'hg_token_hash_cache';
const CACHE_PREFIX = `${CACHE_KEY}:`;
const FLUSH_DELAY = 1500;
const FLUSH_INTERVAL = 15000;
const HASH_HEX_LENGTH = 20;
const LEGACY_HASH_HEX_LENGTH = 16;

type TokenCacheMap = Record<string, number>;

let memoryCache: TokenCacheMap | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let loadPromise: Promise<TokenCacheMap> | null = null;
let dirtyHashes = new Set<string>();
let migrationPromise: Promise<void> | null = null;

const debugLog = (...args: unknown[]) => _debugLog('Cache', ...args);

/**
 * Ensures the in-memory cache is populated from persistent storage.
 * @returns {Promise<Object>} The cache data object.
 */
function loadCache(): Promise<TokenCacheMap> {
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
        await ensureLegacyCacheMigration();

        const allValues = await getAllIdbValues();
        const hydrated: TokenCacheMap = {};

        for (const [fullKey, value] of Object.entries(allValues)) {
            if (!fullKey.startsWith(CACHE_PREFIX)) continue;
            const hash = fullKey.slice(CACHE_PREFIX.length);
            if (!hash) continue;
            if (Number.isFinite(value)) {
                hydrated[hash] = Number(value);
            }
        }

        memoryCache = hydrated;
        debugLog('Cache loaded,', Object.keys(memoryCache).length, 'entries');
        return memoryCache;
    })();

    return loadPromise;
}

function readLegacyLocalStorageMap(): Record<string, unknown> | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

function removeLegacyLocalStorageMap() {
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch {}
}

async function ensureLegacyCacheMigration(): Promise<void> {
    if (migrationPromise) return migrationPromise;

    migrationPromise = (async () => {
        const allValues = await getAllIdbValues();
        const existingHashes = new Set<string>();

        for (const fullKey of Object.keys(allValues)) {
            if (!fullKey.startsWith(CACHE_PREFIX)) continue;
            const hash = fullKey.slice(CACHE_PREFIX.length);
            if (hash) existingHashes.add(hash);
        }

        const legacyMaps = [await getStorageValue(CACHE_KEY, null), readLegacyLocalStorageMap()];

        const batch: Record<string, unknown> = {};
        let migratedCount = 0;

        for (const legacyMap of legacyMaps) {
            if (!legacyMap || typeof legacyMap !== 'object') continue;

            for (const [hash, count] of Object.entries(legacyMap)) {
                if (typeof hash !== 'string' || !Number.isFinite(count)) {
                    continue;
                }

                if (existingHashes.has(hash)) {
                    continue;
                }

                batch[`${CACHE_PREFIX}${hash}`] = count;
                existingHashes.add(hash);
                migratedCount++;
            }
        }

        if (migratedCount > 0) {
            await setIdbValues(batch);
            debugLog('Migrated', migratedCount, 'legacy cache entries to IDB');
        }

        await removeStorageValue(CACHE_KEY);
        removeLegacyLocalStorageMap();
    })();

    return migrationPromise;
}

/**
 * Persists the current in-memory cache state back to storage.
 */
async function flushToStorage() {
    if (!memoryCache || dirtyHashes.size === 0) return;

    const hashes = Array.from(dirtyHashes);
    dirtyHashes = new Set();

    const batch: Record<string, unknown> = {};
    for (const hash of hashes) {
        const value = memoryCache[hash];
        if (Number.isFinite(value)) {
            batch[`${CACHE_PREFIX}${hash}`] = value;
        }
    }

    if (Object.keys(batch).length === 0) return;

    debugLog('Flushing', Object.keys(batch).length, 'entries to storage');

    await setIdbValues(batch);
}

/**
 * Debounces cache writes to storage to prevent excessive API calls.
 */
function scheduleFlush() {
    if (flushTimer) {
        clearTimeout(flushTimer);
    }
    flushTimer = setTimeout(flushToStorage, FLUSH_DELAY);
}

try {
    window.addEventListener('beforeunload', flushToStorage);
    window.setInterval(() => {
        void flushToStorage();
    }, FLUSH_INTERVAL);

    queueMicrotask(() => {
        void ensureLegacyCacheMigration();
    });
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
export function sanitizeMessageText(text: string, role: 'input' | 'output'): string {
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
export async function hashText(text: string): Promise<string> {
    const normalized = (text || '').replace(/\s+/g, ' ').trim();
    const encoded = new TextEncoder().encode(normalized);
    const buffer = await crypto.subtle.digest('SHA-256', encoded);
    const bytes = new Uint8Array(buffer);
    let hex = '';
    for (let i = 0; i < HASH_HEX_LENGTH / 2; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}

/**
 * Look up a cached token count by its text hash.
 * @param {string} hash - The SHA-256 hash of the text.
 * @returns {Promise<number|null>}
 */
export async function getCachedTokenCount(hash: string): Promise<number | null> {
    const cache = await loadCache();
    const directValue = cache[hash];
    let result = Number.isFinite(directValue) ? directValue : null;

    if (result === null && hash.length > LEGACY_HASH_HEX_LENGTH) {
        const legacyHash = hash.slice(0, LEGACY_HASH_HEX_LENGTH);
        const legacyValue = cache[legacyHash];
        if (Number.isFinite(legacyValue)) {
            cache[hash] = legacyValue;
            dirtyHashes.add(hash);
            scheduleFlush();
            result = legacyValue;
        }
    }

    debugLog(result !== null ? `Cache HIT ${hash} → ${result}` : `Cache MISS ${hash}`);
    return result;
}

/**
 * Store a token count in the cache for a given text hash.
 * @param {string} hash
 * @param {number} count
 */
export async function setCachedTokenCount(hash: string, count: number): Promise<void> {
    const cache = await loadCache();
    cache[hash] = count;
    dirtyHashes.add(hash);
    debugLog(`Cache SET ${hash} → ${count}`);
    scheduleFlush();
}

export function forceFlush() {
    void flushToStorage();
}

export async function getAllCacheData() {
    const cache = await loadCache();
    return { ...cache };
}

export async function importCacheData(data: unknown): Promise<number> {
    if (!data || typeof data !== 'object') return 0;
    const cache = await loadCache();
    let imported = 0;
    for (const [hash, count] of Object.entries(data as Record<string, unknown>)) {
        if (typeof hash === 'string' && Number.isFinite(count)) {
            cache[hash] = Number(count);
            dirtyHashes.add(hash);
            imported++;
        }
    }
    await flushToStorage();
    return imported;
}

export async function getCacheStats() {
    const cache = await loadCache();
    const entries = Object.keys(cache).length;
    return { entries };
}

export async function clearCacheData() {
    const cache = await loadCache();
    const hashes = Object.keys(cache);

    if (flushTimer) {
        clearTimeout(flushTimer);
    }
    dirtyHashes = new Set();

    if (hashes.length > 0) {
        const idbKeys = hashes.map((hash) => `${CACHE_PREFIX}${hash}`);
        await removeIdbValues(idbKeys);
    }

    await removeStorageValue(CACHE_KEY);
    memoryCache = {};

    return hashes.length;
}
