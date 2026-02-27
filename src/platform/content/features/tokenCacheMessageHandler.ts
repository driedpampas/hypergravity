import {
    clearCacheData,
    getAllCacheData,
    getCacheStats,
    importCacheData,
} from '@utils/tokenHashCache';
import {
    TOKEN_CACHE_MESSAGE_TYPES,
    type TokenCacheMessage,
} from '@shared/contracts/tokenCacheMessages';

export function registerTokenCacheMessageHandler(): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        const typedMessage = message as TokenCacheMessage | undefined;

        if (typedMessage?.type === TOKEN_CACHE_MESSAGE_TYPES.getStats) {
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

        if (typedMessage?.type === TOKEN_CACHE_MESSAGE_TYPES.getAll) {
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

        if (typedMessage?.type === TOKEN_CACHE_MESSAGE_TYPES.import) {
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

        if (typedMessage?.type === TOKEN_CACHE_MESSAGE_TYPES.clear) {
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
