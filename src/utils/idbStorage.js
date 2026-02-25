import { openDB } from 'idb';

const DB_NAME = 'hypergravity';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

let dbPromise = null;
let pendingWriteOps = new Map();
let flushScheduled = false;
let pendingFlushPromise = null;
let resolvePendingFlush = null;

function getDb() {
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

function ensureFlushScheduled() {
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

async function flushPendingWrites() {
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

export async function getIdbValue(key, fallback = undefined) {
    try {
        const db = await getDb();
        const value = await db.get(STORE_NAME, key);
        return value === undefined ? fallback : value;
    } catch {
        return fallback;
    }
}

export async function setIdbValue(key, value) {
    pendingWriteOps.set(key, { type: 'set', value });
    await ensureFlushScheduled();
}

export async function removeIdbValue(key) {
    pendingWriteOps.set(key, { type: 'delete' });
    await ensureFlushScheduled();
}

export async function setIdbValues(values) {
    if (!values || typeof values !== 'object') return;

    for (const [key, value] of Object.entries(values)) {
        pendingWriteOps.set(key, { type: 'set', value });
    }

    await ensureFlushScheduled();
}

export async function removeIdbValues(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return;

    for (const key of keys) {
        pendingWriteOps.set(key, { type: 'delete' });
    }

    await ensureFlushScheduled();
}

export async function getIdbValues(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return {};

    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const result = {};

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

export async function getAllIdbValues() {
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        const [keys, values] = await Promise.all([
            store.getAllKeys(),
            store.getAll(),
        ]);
        await tx.done;

        const result = {};
        keys.forEach((key, index) => {
            result[String(key)] = values[index];
        });
        return result;
    } catch {
        return {};
    }
}