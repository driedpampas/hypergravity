export type StoredChat = {
    id: string;
    title: string;
    url: string;
    pinned: boolean;
};

export type StoredFolder = {
    id: string;
    name: string;
    color: string;
    chats: StoredChat[];
    parentId: string | null;
    expanded: boolean;
};

export type FoldersData = {
    folders: StoredFolder[];
    recycleBin: unknown[];
    permanentlyDeleted: unknown[];
};

const DEFAULT_FOLDERS_DATA: FoldersData = {
    folders: [],
    recycleBin: [],
    permanentlyDeleted: [],
};

function normalizeChat(chat: unknown): StoredChat | null {
    if (!chat || typeof chat !== 'object') return null;
    const chatObj = chat as Record<string, unknown>;
    const id = String(chatObj.id || '').trim();
    if (!id) return null;

    return {
        id,
        title: String(chatObj.title || 'Untitled Chat').trim() || 'Untitled Chat',
        url: String(chatObj.url || '').trim(),
        pinned: Boolean(chatObj.pinned),
    };
}

function normalizeFolder(folder: unknown): StoredFolder | null {
    if (!folder || typeof folder !== 'object') return null;
    const folderObj = folder as Record<string, unknown>;
    const id = String(folderObj.id || '').trim();
    const name = String(folderObj.name || '').trim();
    if (!id || !name) return null;

    const chats = Array.isArray(folderObj.chats)
        ? folderObj.chats.map(normalizeChat).filter((chat): chat is StoredChat => chat !== null)
        : [];

    return {
        id,
        name,
        color: String(folderObj.color || '#4285f4'),
        chats,
        parentId: (folderObj.parentId as string | null | undefined) || null,
        expanded: folderObj.expanded !== false,
    };
}

export function normalizeFoldersData(value: unknown): FoldersData {
    if (Array.isArray(value)) {
        return {
            ...DEFAULT_FOLDERS_DATA,
            folders: value
                .map(normalizeFolder)
                .filter((folder): folder is StoredFolder => folder !== null),
        };
    }

    if (!value || typeof value !== 'object') {
        return { ...DEFAULT_FOLDERS_DATA };
    }

    const valueObj = value as Record<string, unknown>;

    return {
        folders: Array.isArray(valueObj.folders)
            ? valueObj.folders
                  .map(normalizeFolder)
                  .filter((folder): folder is StoredFolder => folder !== null)
            : [],
        recycleBin: Array.isArray(valueObj.recycleBin) ? valueObj.recycleBin : [],
        permanentlyDeleted: Array.isArray(valueObj.permanentlyDeleted)
            ? valueObj.permanentlyDeleted
            : [],
    };
}

export function withUpdatedFolders(previousValue: unknown, nextFolders: unknown): FoldersData {
    const base = normalizeFoldersData(previousValue);
    return {
        ...base,
        folders: Array.isArray(nextFolders)
            ? nextFolders
                  .map(normalizeFolder)
                  .filter((folder): folder is StoredFolder => folder !== null)
            : [],
    };
}
