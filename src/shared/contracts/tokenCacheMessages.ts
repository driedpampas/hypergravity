export const TOKEN_CACHE_MESSAGE_TYPES = {
    getStats: 'HG_TOKEN_CACHE_GET_STATS',
    getAll: 'HG_TOKEN_CACHE_GET_ALL',
    import: 'HG_TOKEN_CACHE_IMPORT',
    clear: 'HG_TOKEN_CACHE_CLEAR',
} as const;

export type TokenCacheGetStatsMessage = {
    type: (typeof TOKEN_CACHE_MESSAGE_TYPES)['getStats'];
};

export type TokenCacheGetAllMessage = {
    type: (typeof TOKEN_CACHE_MESSAGE_TYPES)['getAll'];
};

export type TokenCacheImportMessage = {
    type: (typeof TOKEN_CACHE_MESSAGE_TYPES)['import'];
    data?: unknown;
};

export type TokenCacheClearMessage = {
    type: (typeof TOKEN_CACHE_MESSAGE_TYPES)['clear'];
};

export type TokenCacheMessage =
    | TokenCacheGetStatsMessage
    | TokenCacheGetAllMessage
    | TokenCacheImportMessage
    | TokenCacheClearMessage;

export type TokenCacheResponse = {
    success?: boolean;
    error?: string;
    data?: Record<string, unknown>;
    imported?: number;
    cleared?: number;
    entries?: number;
};
