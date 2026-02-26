import {
    clearCacheData,
    getAllCacheData,
    getCacheStats,
    importCacheData,
} from '@utils/tokenHashCache';

type TokenCacheMessage = {
    type:
        | 'HG_TOKEN_CACHE_GET_STATS'
        | 'HG_TOKEN_CACHE_GET_ALL'
        | 'HG_TOKEN_CACHE_IMPORT'
        | 'HG_TOKEN_CACHE_CLEAR';
    data?: unknown;
};

export function registerTokenCacheMessageHandler(): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        const typedMessage = message as TokenCacheMessage | undefined;

        if (typedMessage?.type === 'HG_TOKEN_CACHE_GET_STATS') {
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

        if (typedMessage?.type === 'HG_TOKEN_CACHE_GET_ALL') {
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

        if (typedMessage?.type === 'HG_TOKEN_CACHE_IMPORT') {
            importCacheData(typedMessage?.data)
                .then((imported) => sendResponse({ success: true, imported }))
                .catch((error) =>
                    sendResponse({
                        success: false,
                        error: error?.message || 'Unknown error',
                    })
                );
            return true;
        }

        if (typedMessage?.type === 'HG_TOKEN_CACHE_CLEAR') {
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
