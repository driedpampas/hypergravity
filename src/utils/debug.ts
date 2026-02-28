declare global {
    interface Window {
        __HG_DEBUG__?: boolean;
    }
}

const DEBUG_BUILD_ENABLED = __HG_DEBUG_BUILD__;

const DEBUG_STORAGE_KEY = 'hg_debug';

function normalizeScope(scope: string): string {
    return scope.trim().toLowerCase();
}

function parseDebugScopes(rawValue: string | null): Set<string> {
    if (!rawValue) return new Set();

    return new Set(
        rawValue
            .split(/[\s,|]+/)
            .map((part) => normalizeScope(part))
            .filter(Boolean)
    );
}

/**
 * Checks if debug logging is enabled via window flag or localStorage.
 * `localStorage.hg_debug` supports `1|true|*|all` or scoped values (comma/space/pipe separated).
 * @returns {boolean}
 */
export function isDebugEnabled(scope?: string): boolean {
    if (!DEBUG_BUILD_ENABLED) return false;

    if (window.__HG_DEBUG__ === true) return true;

    const scopes = parseDebugScopes(localStorage.getItem(DEBUG_STORAGE_KEY));
    if (scopes.has('*') || scopes.has('all') || scopes.has('1') || scopes.has('true')) {
        return true;
    }

    if (scope) {
        const normalizedScope = normalizeScope(scope);
        if (scopes.has(normalizedScope)) return true;
    }

    return false;
}

/**
 * Conditionally logs debug information to the console if debugging is enabled.
 * @param {string} tag - Context tag for the log message.
 * @param {...*} args - Arguments to log.
 */
export function debugLog(tag: string, ...args: unknown[]): void {
    if (!DEBUG_BUILD_ENABLED) return;

    if (isDebugEnabled(tag)) {
        console.debug(`[HG ${tag}]`, ...args);
    }
}

export function debugSelectorMatch(
    context: string,
    selector: string,
    matched: boolean,
    extra: Record<string, unknown> = {}
): void {
    if (!DEBUG_BUILD_ENABLED) return;

    if (!isDebugEnabled('selectors') && !isDebugEnabled(context)) return;

    console.log(`[HG Selectors:${context}]`, {
        selector,
        matched,
        ...extra,
    });
}
