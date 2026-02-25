const DEFAULT_FOLDERS_DATA = {
    folders: [],
    recycleBin: [],
    permanentlyDeleted: [],
};

function normalizeChat(chat) {
    if (!chat || typeof chat !== 'object') return null;
    const id = String(chat.id || '').trim();
    if (!id) return null;

    return {
        id,
        title: String(chat.title || 'Untitled Chat').trim() || 'Untitled Chat',
        url: String(chat.url || '').trim(),
        pinned: Boolean(chat.pinned),
    };
}

function normalizeFolder(folder) {
    if (!folder || typeof folder !== 'object') return null;
    const id = String(folder.id || '').trim();
    const name = String(folder.name || '').trim();
    if (!id || !name) return null;

    const chats = Array.isArray(folder.chats)
        ? folder.chats.map(normalizeChat).filter(Boolean)
        : [];

    return {
        id,
        name,
        color: String(folder.color || '#4285f4'),
        chats,
        parentId: folder.parentId || null,
        expanded: folder.expanded !== false,
    };
}

export function normalizeFoldersData(value) {
    if (Array.isArray(value)) {
        return {
            ...DEFAULT_FOLDERS_DATA,
            folders: value.map(normalizeFolder).filter(Boolean),
        };
    }

    if (!value || typeof value !== 'object') {
        return { ...DEFAULT_FOLDERS_DATA };
    }

    return {
        folders: Array.isArray(value.folders)
            ? value.folders.map(normalizeFolder).filter(Boolean)
            : [],
        recycleBin: Array.isArray(value.recycleBin) ? value.recycleBin : [],
        permanentlyDeleted: Array.isArray(value.permanentlyDeleted)
            ? value.permanentlyDeleted
            : [],
    };
}

export function withUpdatedFolders(previousValue, nextFolders) {
    const base = normalizeFoldersData(previousValue);
    return {
        ...base,
        folders: Array.isArray(nextFolders)
            ? nextFolders.map(normalizeFolder).filter(Boolean)
            : [],
    };
}
