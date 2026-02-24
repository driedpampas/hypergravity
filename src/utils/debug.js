/**
 * Checks if debug logging is enabled via window flag or localStorage.
 * @returns {boolean}
 */
function isDebugEnabled() {
    return (
        window.__HG_DEBUG_TOKEN_COUNTER__ === true ||
        localStorage.getItem('hg_debug_token_counter') === '1'
    );
}

/**
 * Conditionally logs debug information to the console if debugging is enabled.
 * @param {string} tag - Context tag for the log message.
 * @param {...*} args - Arguments to log.
 */
export function debugLog(tag, ...args) {
    if (isDebugEnabled()) {
        console.log(`[HG ${tag}]`, ...args);
    }
}
