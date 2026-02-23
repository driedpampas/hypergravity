function isDebugEnabled() {
    return (
        window.__HG_DEBUG_TOKEN_COUNTER__ === true ||
        localStorage.getItem('hg_debug_token_counter') === '1'
    );
}

export function debugLog(tag, ...args) {
    if (isDebugEnabled()) {
        console.log(`[HG ${tag}]`, ...args);
    }
}
