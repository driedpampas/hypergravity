import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'hypergravity';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

type PendingWriteOperation =
    | { type: 'set'; value: unknown }
    | { type: 'delete' };

interface HypergravityDbSchema extends DBSchema {
    kv: {
        key: string;
        value: unknown;
    };
}

let dbPromise: Promise<IDBPDatabase<HypergravityDbSchema>> | null = null;
let pendingWriteOps = new Map<string, PendingWriteOperation>();
let flushScheduled = false;
let pendingFlushPromise: Promise<void> | null = null;
let resolvePendingFlush: (() => void) | null = null;

function getDb(): Promise<IDBPDatabase<HypergravityDbSchema>> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            },
        });
    }

    return dbPromise;
}

function ensureFlushScheduled(): Promise<void> {
    if (!pendingFlushPromise) {
        pendingFlushPromise = new Promise((resolve) => {
            resolvePendingFlush = resolve;
        });
    }

    if (!flushScheduled) {
        flushScheduled = true;
        queueMicrotask(flushPendingWrites);
    }

    return pendingFlushPromise;
}

async function flushPendingWrites(): Promise<void> {
    const ops = pendingWriteOps;
    pendingWriteOps = new Map();

    flushScheduled = false;

    const done = resolvePendingFlush;
    pendingFlushPromise = null;
    resolvePendingFlush = null;

    try {
        if (ops.size > 0) {
            const db = await getDb();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            for (const [key, op] of ops.entries()) {
                if (op.type === 'set') {
                    store.put(op.value, key);
                } else {
                    store.delete(key);
                }
            }

            await tx.done;
        }
    } catch {
    } finally {
        if (done) done();
        if (pendingWriteOps.size > 0 && !flushScheduled) {
            flushScheduled = true;
            queueMicrotask(flushPendingWrites);
        }
    }
}

export async function getIdbValue<T = unknown>(
    key: string,
    fallback: T = undefined as T
): Promise<T | unknown> {
    try {
        const db = await getDb();
        const value = await db.get(STORE_NAME, key);
        return value === undefined ? fallback : value;
    } catch {
        return fallback;
    }
}

export async function setIdbValue(key: string, value: unknown): Promise<void> {
    pendingWriteOps.set(key, { type: 'set', value });
    await ensureFlushScheduled();
}

export async function removeIdbValue(key: string): Promise<void> {
    pendingWriteOps.set(key, { type: 'delete' });
    await ensureFlushScheduled();
}

export async function setIdbValues(
    values: Record<string, unknown>
): Promise<void> {
    if (!values || typeof values !== 'object') return;

    for (const [key, value] of Object.entries(values)) {
        pendingWriteOps.set(key, { type: 'set', value });
    }

    await ensureFlushScheduled();
}

export async function removeIdbValues(keys: string[]): Promise<void> {
    if (!Array.isArray(keys) || keys.length === 0) return;

    for (const key of keys) {
        pendingWriteOps.set(key, { type: 'delete' });
    }

    await ensureFlushScheduled();
}

export async function getIdbValues(
    keys: string[]
): Promise<Record<string, unknown>> {
    if (!Array.isArray(keys) || keys.length === 0) return {};

    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const result: Record<string, unknown> = {};

        await Promise.all(
            keys.map(async (key) => {
                result[key] = await store.get(key);
            })
        );

        await tx.done;
        return result;
    } catch {
        return {};
    }
}

export async function getAllIdbValues(): Promise<Record<string, unknown>> {
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        const [keys, values] = await Promise.all([
            store.getAllKeys(),
            store.getAll(),
        ]);
        await tx.done;

        const result: Record<string, unknown> = {};
        keys.forEach((key, index) => {
            result[String(key)] = values[index];
        });
        return result;
    } catch {
        return {};
    }
}