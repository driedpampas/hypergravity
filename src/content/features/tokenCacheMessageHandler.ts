// @ts-nocheck
import {
    getCacheStats,
    getAllCacheData,
    importCacheData,
    clearCacheData,
} from '@utils/tokenHashCache';

export function registerTokenCacheMessageHandler() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message?.type === 'HG_TOKEN_CACHE_GET_STATS') {
            getCacheStats()
                .then((stats) => sendResponse({ success: true, ...stats }))
                .catch((error) =>
                    sendResponse({
                        success: false,
                        error: error?.message || 'Unknown error',
                    })
                );
            return true;
        }

        if (message?.type === 'HG_TOKEN_CACHE_GET_ALL') {
            getAllCacheData()
                .then((data) => sendResponse({ success: true, data }))
                .catch((error) =>
                    sendResponse({
                        success: false,
                        error: error?.message || 'Unknown error',
                    })
                );
            return true;
        }

        if (message?.type === 'HG_TOKEN_CACHE_IMPORT') {
            importCacheData(message?.data)
                .then((imported) => sendResponse({ success: true, imported }))
                .catch((error) =>
                    sendResponse({
                        success: false,
                        error: error?.message || 'Unknown error',
                    })
                );
            return true;
        }

        if (message?.type === 'HG_TOKEN_CACHE_CLEAR') {
            clearCacheData()
                .then((cleared) => sendResponse({ success: true, cleared }))
                .catch((error) =>
                    sendResponse({
                        success: false,
                        error: error?.message || 'Unknown error',
                    })
                );
            return true;
        }

        return undefined;
    });
}
