// @ts-nocheck
import { useMemo, useState } from 'preact/hooks';

import { useStorage } from '@hooks/useStorage';
import {
    findActiveChatInfo,
    getAccountAwareUrl,
    inferChatInfoFromConversationRow,
} from '@content/helpers/chatInfo';
import { showToast } from '@content/helpers/toast';
import { FOLDERS_KEY } from '@utils/constants';
import {
    normalizeFoldersData,
    withUpdatedFolders,
} from '@utils/foldersData';
import {
    FolderBackIcon,
    FolderAddIcon,
    FolderEmptyIcon,
    FolderFilledIcon,
    FolderDeleteIcon,
} from '@icons';
import './FoldersManager.css';

export function FoldersManager({ onClose }) {
    const [storedFolders, setStoredFolders, isFoldersLoaded] = useStorage(
        FOLDERS_KEY,
        {
            folders: [],
            recycleBin: [],
            permanentlyDeleted: [],
        }
    );
    const [newFolderName, setNewFolderName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newFolderParentId, setNewFolderParentId] = useState(null);
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [editingFolderId, setEditingFolderId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [isRecycleView, setIsRecycleView] = useState(false);
    const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
    const [bulkSearch, setBulkSearch] = useState('');
    const [bulkCandidates, setBulkCandidates] = useState([]);
    const [bulkSelected, setBulkSelected] = useState(new Set());

    const foldersData = normalizeFoldersData(storedFolders);
    const folders = foldersData.folders;
    const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) || null;
    const selectedFolderChildren = selectedFolder
        ? folders.filter((folder) => (folder.parentId || null) === selectedFolder.id)
        : [];
    const folderIds = useMemo(() => new Set(folders.map((folder) => folder.id)), [
        folders,
    ]);

    const saveFolders = (nextFolders) => {
        setStoredFolders(withUpdatedFolders(storedFolders, nextFolders));
    };

    const saveFoldersData = ({
        nextFolders = folders,
        nextRecycleBin = foldersData.recycleBin,
        nextPermanentlyDeleted = foldersData.permanentlyDeleted,
    }) => {
        setStoredFolders({
            ...foldersData,
            folders: nextFolders,
            recycleBin: nextRecycleBin,
            permanentlyDeleted: nextPermanentlyDeleted,
        });
    };

    const getDirectChildren = (parentId) =>
        folders.filter((folder) => (folder.parentId || null) === (parentId || null));

    const getDescendantIds = (folderId) => {
        const ids = new Set([folderId]);
        const stack = [folderId];

        while (stack.length > 0) {
            const current = stack.pop();
            folders.forEach((folder) => {
                if ((folder.parentId || null) === current && !ids.has(folder.id)) {
                    ids.add(folder.id);
                    stack.push(folder.id);
                }
            });
        }

        return ids;
    };

    const getAllSidebarChats = () => {
        const rows = Array.from(
            document.querySelectorAll(
                '.conversation, .conversation-list-item, [class*="conversation-item"], [data-test-id*="conversation"]'
            )
        );

        const seenIds = new Set();
        const chats = [];

        rows.forEach((row) => {
            const info = inferChatInfoFromConversationRow(row);
            if (!info || seenIds.has(info.id)) return;
            seenIds.add(info.id);
            chats.push({
                id: info.id,
                title: info.title,
                url: info.url || getAccountAwareUrl(info.id),
            });
        });

        const active = findActiveChatInfo();
        if (active && !seenIds.has(active.id)) {
            chats.unshift({
                id: active.id,
                title: active.title,
                url: active.url || getAccountAwareUrl(active.id),
            });
        }

        return chats;
    };

    const resetAddFolderForm = () => {
        setNewFolderName('');
        setIsAdding(false);
        setNewFolderParentId(null);
    };

    const addFolder = () => {
        const folderName = newFolderName.trim();
        if (!folderName) {
            showToast('Folder name is required', 'error');
            return;
        }

        if (
            folders.some(
                (folder) => folder.name.toLowerCase() === folderName.toLowerCase()
            )
        ) {
            showToast('Folder name already exists', 'info');
            return;
        }

        const newFolder = {
            id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: folderName,
            color: '#4285f4',
            chats: [],
            parentId: newFolderParentId,
            expanded: true,
        };

        saveFolders([...folders, newFolder]);
        resetAddFolderForm();
        showToast(`Folder "${folderName}" created`, 'success');
    };

    const startAddFolder = (parentId = null) => {
        setIsAdding(true);
        setNewFolderParentId(parentId);
        setIsBulkAddOpen(false);
    };

    const toggleFolderExpanded = (folderId) => {
        saveFolders(
            folders.map((folder) =>
                folder.id === folderId
                    ? { ...folder, expanded: folder.expanded === false }
                    : folder
            )
        );
    };

    const deleteFolder = (id) => {
        const folder = folders.find((item) => item.id === id);
        if (!folder) return;

        const descendantIds = getDescendantIds(id);
        const affectedFolders = folders.filter((item) => descendantIds.has(item.id));

        const shouldDelete = window.confirm(
            `Delete folder "${folder.name}" and move it to recycle bin?`
        );
        if (!shouldDelete) return;

        const nextFolders = folders.filter((item) => !descendantIds.has(item.id));
        const recycleEntry = {
            id: `recycle_folder_${id}_${Date.now()}`,
            type: 'folder',
            title: folder.name,
            deletedAt: Date.now(),
            folders: affectedFolders,
        };
        const nextRecycleBin = [...foldersData.recycleBin, recycleEntry];

        saveFoldersData({
            nextFolders,
            nextRecycleBin,
        });

        if (selectedFolderId && descendantIds.has(selectedFolderId)) {
            setSelectedFolderId(null);
        }

        if (editingFolderId === id) {
            setEditingFolderId(null);
            setEditingName('');
        }

        showToast('Folder moved to recycle bin', 'success');
    };

    const startRenameFolder = (folder) => {
        setEditingFolderId(folder.id);
        setEditingName(folder.name);
    };

    const saveRenameFolder = (id) => {
        const folderName = editingName.trim();
        if (!folderName) {
            showToast('Folder name is required', 'error');
            return;
        }

        if (
            folders.some(
                (folder) =>
                    folder.id !== id &&
                    folder.name.toLowerCase() === folderName.toLowerCase()
            )
        ) {
            showToast('Folder name already exists', 'info');
            return;
        }

        saveFolders(
            folders.map((folder) =>
                folder.id === id ? { ...folder, name: folderName } : folder
            )
        );

        setEditingFolderId(null);
        setEditingName('');
        showToast('Folder updated', 'success');
    };

    const removeChatFromFolder = (folderId, chatId, sendToRecycle = true) => {
        const folder = folders.find((item) => item.id === folderId);
        if (!folder) return;

        const removedChat = (folder.chats || []).find((chat) => chat.id === chatId);
        const chats = Array.isArray(folder.chats)
            ? folder.chats.filter((chat) => chat.id !== chatId)
            : [];

        const nextFolders = folders.map((item) =>
            item.id === folderId ? { ...item, chats } : item
        );

        if (!sendToRecycle || !removedChat) {
            saveFolders(nextFolders);
            showToast('Chat removed from folder', 'success');
            return;
        }

        const existingRecycleIndex = foldersData.recycleBin.findIndex(
            (item) => item.type === 'chat' && item.id === removedChat.id
        );

        const nextRecycleBin = [...foldersData.recycleBin];

        if (existingRecycleIndex >= 0) {
            const existing = nextRecycleBin[existingRecycleIndex];
            const folderIdsForRestore = new Set(existing.originalFolderIds || []);
            folderIdsForRestore.add(folderId);

            nextRecycleBin[existingRecycleIndex] = {
                ...existing,
                originalFolderIds: Array.from(folderIdsForRestore),
                title: removedChat.title,
                url: removedChat.url,
                deletedAt: Date.now(),
            };
        } else {
            nextRecycleBin.push({
                id: removedChat.id,
                type: 'chat',
                title: removedChat.title,
                url: removedChat.url,
                deletedAt: Date.now(),
                originalFolderIds: [folderId],
            });
        }

        saveFoldersData({
            nextFolders,
            nextRecycleBin,
        });
        showToast('Chat removed from folder', 'success');
    };

    const restoreRecycleItem = (recycleId) => {
        const item = foldersData.recycleBin.find((entry) => entry.id === recycleId);
        if (!item) return;

        if (item.type === 'chat') {
            const targetFolderIds = Array.isArray(item.originalFolderIds)
                ? item.originalFolderIds.filter((id) => folderIds.has(id))
                : [];

            if (targetFolderIds.length === 0) {
                showToast('Original folder no longer exists', 'info');
                return;
            }

            const nextFolders = folders.map((folder) => {
                if (!targetFolderIds.includes(folder.id)) return folder;
                const chats = Array.isArray(folder.chats) ? [...folder.chats] : [];
                if (!chats.some((chat) => chat.id === item.id)) {
                    chats.push({
                        id: item.id,
                        title: item.title || 'Untitled Chat',
                        url: item.url || getAccountAwareUrl(item.id),
                        pinned: false,
                    });
                }
                return { ...folder, chats };
            });

            const nextRecycleBin = foldersData.recycleBin.filter(
                (entry) => entry.id !== recycleId
            );

            saveFoldersData({
                nextFolders,
                nextRecycleBin,
            });
            showToast('Chat restored', 'success');
            return;
        }

        if (item.type === 'folder') {
            const storedSubtree = Array.isArray(item.folders) ? item.folders : [];
            if (storedSubtree.length === 0) {
                showToast('No folder data to restore', 'error');
                return;
            }

            const existingIds = new Set(folders.map((folder) => folder.id));
            const subtreeIds = new Set(storedSubtree.map((folder) => folder.id));

            const restorable = storedSubtree
                .filter((folder) => !existingIds.has(folder.id))
                .map((folder) => {
                    let parentId = folder.parentId || null;
                    if (
                        parentId &&
                        !existingIds.has(parentId) &&
                        !subtreeIds.has(parentId)
                    ) {
                        parentId = null;
                    }
                    return {
                        ...folder,
                        parentId,
                        expanded: folder.expanded !== false,
                    };
                });

            if (restorable.length === 0) {
                showToast('Folders already exist; nothing restored', 'info');
                return;
            }

            const nextFolders = [...folders, ...restorable];
            const nextRecycleBin = foldersData.recycleBin.filter(
                (entry) => entry.id !== recycleId
            );

            saveFoldersData({
                nextFolders,
                nextRecycleBin,
            });
            showToast('Folder restored', 'success');
        }
    };

    const permanentlyDeleteRecycleItem = (recycleId) => {
        const nextRecycleBin = foldersData.recycleBin.filter(
            (entry) => entry.id !== recycleId
        );
        const nextPermanentlyDeleted = Array.from(
            new Set([...foldersData.permanentlyDeleted, recycleId])
        );

        saveFoldersData({
            nextRecycleBin,
            nextPermanentlyDeleted,
        });

        showToast('Item permanently deleted', 'success');
    };

    const openBulkAdd = () => {
        if (!selectedFolder) return;
        const candidates = getAllSidebarChats().filter(
            (chat) => !(selectedFolder.chats || []).some((item) => item.id === chat.id)
        );

        if (candidates.length === 0) {
            showToast('No available chats to add', 'info');
            return;
        }

        setBulkCandidates(candidates);
        setBulkSelected(new Set());
        setBulkSearch('');
        setIsBulkAddOpen(true);
    };

    const closeBulkAdd = () => {
        setIsBulkAddOpen(false);
        setBulkCandidates([]);
        setBulkSelected(new Set());
        setBulkSearch('');
    };

    const toggleBulkSelection = (chatId) => {
        const next = new Set(bulkSelected);
        if (next.has(chatId)) next.delete(chatId);
        else next.add(chatId);
        setBulkSelected(next);
    };

    const addSelectedBulkChats = () => {
        if (!selectedFolder || bulkSelected.size === 0) return;

        const selectedChatMap = new Map(
            bulkCandidates
                .filter((chat) => bulkSelected.has(chat.id))
                .map((chat) => [chat.id, chat])
        );

        const nextFolders = folders.map((folder) => {
            if (folder.id !== selectedFolder.id) return folder;
            const chats = Array.isArray(folder.chats) ? [...folder.chats] : [];

            selectedChatMap.forEach((chat, id) => {
                if (chats.some((item) => item.id === id)) return;
                chats.push({
                    id: chat.id,
                    title: chat.title,
                    url: chat.url || getAccountAwareUrl(chat.id),
                    pinned: false,
                });
            });

            return { ...folder, chats };
        });

        saveFolders(nextFolders);
        closeBulkAdd();
        showToast('Selected chats added to folder', 'success');
    };

    const visibleBulkCandidates = bulkCandidates.filter((chat) =>
        chat.title.toLowerCase().includes(bulkSearch.toLowerCase())
    );

    const renderFolderRows = (parentId = null, depth = 0) => {
        const rows = getDirectChildren(parentId);
        return rows.map((folder) => {
            const children = getDirectChildren(folder.id);
            const isExpanded = folder.expanded !== false;

            return (
                <div key={folder.id}>
                    <div
                        class="hg-folder-item"
                        style={{ paddingLeft: `${24 + depth * 18}px` }}
                    >
                        <div class="hg-folder-info">
                            {children.length > 0 ? (
                                <button
                                    class="hg-folder-chevron"
                                    type="button"
                                    onClick={() => toggleFolderExpanded(folder.id)}
                                >
                                    {isExpanded ? '▾' : '▸'}
                                </button>
                            ) : (
                                <span class="hg-folder-chevron-placeholder" />
                            )}

                            <FolderFilledIcon
                                width="20"
                                height="20"
                                style={{ color: folder.color }}
                            />

                            {editingFolderId === folder.id ? (
                                <input
                                    class="hg-folder-rename-input"
                                    value={editingName}
                                    onInput={(event) =>
                                        setEditingName(event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            saveRenameFolder(folder.id);
                                        }
                                        if (event.key === 'Escape') {
                                            setEditingFolderId(null);
                                            setEditingName('');
                                        }
                                    }}
                                    autoFocus
                                />
                            ) : (
                                <button
                                    class="hg-folder-open"
                                    type="button"
                                    onClick={() => {
                                        setSelectedFolderId(folder.id);
                                        setIsRecycleView(false);
                                        setIsBulkAddOpen(false);
                                    }}
                                >
                                    {folder.name}
                                </button>
                            )}

                            <span class="hg-folder-count">
                                {folder.chats?.length || 0} chats
                            </span>
                        </div>

                        <div class="hg-folder-actions">
                            {editingFolderId === folder.id ? (
                                <>
                                    <button
                                        class="hg-folder-action-btn"
                                        type="button"
                                        onClick={() => saveRenameFolder(folder.id)}
                                    >
                                        Save
                                    </button>
                                    <button
                                        class="hg-folder-action-btn"
                                        type="button"
                                        onClick={() => {
                                            setEditingFolderId(null);
                                            setEditingName('');
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        class="hg-folder-action-btn"
                                        type="button"
                                        onClick={() => startRenameFolder(folder)}
                                    >
                                        Rename
                                    </button>
                                    <button
                                        class="hg-folder-delete"
                                        type="button"
                                        onClick={() => deleteFolder(folder.id)}
                                    >
                                        <FolderDeleteIcon width="16" height="16" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {children.length > 0 && isExpanded && renderFolderRows(folder.id, depth + 1)}
                </div>
            );
        });
    };

    const addActiveChatToFolder = (folderId) => {
        const folder = folders.find((item) => item.id === folderId);
        const chatInfo = findActiveChatInfo();
        if (!folder || !chatInfo) {
            showToast('Open a chat first to add it', 'info');
            return;
        }

        const chats = Array.isArray(folder.chats) ? [...folder.chats] : [];
        if (chats.some((chat) => chat.id === chatInfo.id)) {
            showToast('Chat is already in this folder', 'info');
            return;
        }

        chats.push({
            id: chatInfo.id,
            title: chatInfo.title,
            url: chatInfo.url || getAccountAwareUrl(chatInfo.id),
            pinned: false,
        });

        saveFolders(
            folders.map((item) =>
                item.id === folderId ? { ...item, chats } : item
            )
        );

        showToast('Active chat added to folder', 'success');
    };

    const handleNewFolderKeyDown = (event) => {
        if (event.key === 'Enter') {
            addFolder();
        }
    };

    return (
        <div class="hg-dialog-overlay" onClick={onClose}>
            <div class="hg-folders-modal" onClick={(event) => event.stopPropagation()}>
                <div class="hg-folders-header">
                    <div class="hg-folders-header-left">
                        <button
                            class="hg-back-btn"
                            onClick={
                                selectedFolder
                                    ? () => {
                                          setSelectedFolderId(null);
                                          setIsBulkAddOpen(false);
                                      }
                                    : isRecycleView
                                      ? () => setIsRecycleView(false)
                                      : onClose
                            }
                        >
                            <FolderBackIcon width="20" height="20" />
                        </button>
                        <h2>
                            {selectedFolder
                                ? selectedFolder.name
                                : isRecycleView
                                  ? 'Recycle Bin'
                                  : 'Folders Menu'}
                        </h2>
                    </div>
                </div>

                <div class="hg-folders-toolbar">
                    {isRecycleView ? null : isAdding ? (
                        <div class="hg-add-folder-form">
                            <input
                                autoFocus
                                type="text"
                                value={newFolderName}
                                onInput={(event) =>
                                    setNewFolderName(event.target.value)
                                }
                                onKeyDown={handleNewFolderKeyDown}
                                placeholder={
                                    newFolderParentId
                                        ? 'Subfolder name...'
                                        : 'Folder name...'
                                }
                            />
                            <button onClick={addFolder}>Save</button>
                            <button onClick={resetAddFolderForm}>Cancel</button>
                        </div>
                    ) : selectedFolder ? (
                        <>
                            <button
                                class="hg-add-folder-btn"
                                onClick={() => addActiveChatToFolder(selectedFolder.id)}
                            >
                                <FolderAddIcon width="14" height="14" />
                                Add Active Chat
                            </button>
                            <button
                                class="hg-add-folder-btn"
                                type="button"
                                onClick={openBulkAdd}
                            >
                                <FolderAddIcon width="14" height="14" />
                                Add Multiple Chats
                            </button>
                            <button
                                class="hg-add-folder-btn"
                                type="button"
                                onClick={() => startAddFolder(selectedFolder.id)}
                            >
                                <FolderAddIcon width="14" height="14" />
                                Add Subfolder
                            </button>
                        </>
                    ) : !isAdding ? (
                        <>
                            <button
                                class="hg-add-folder-btn"
                                onClick={() => startAddFolder(null)}
                            >
                                <FolderAddIcon width="14" height="14" />
                                Add Folder
                            </button>
                            <button
                                class="hg-add-folder-btn"
                                type="button"
                                onClick={() => setIsRecycleView(true)}
                            >
                                Recycle Bin
                            </button>
                        </>
                    ) : null}
                </div>

                <div class="hg-folder-list">
                    {!isFoldersLoaded ? (
                        <div class="hg-empty-state">
                            <p>Loading folders...</p>
                        </div>
                    ) : isRecycleView ? (
                        foldersData.recycleBin.length === 0 ? (
                            <div class="hg-empty-state">
                                <p>Recycle bin is empty</p>
                            </div>
                        ) : (
                            <div class="hg-recycle-list">
                                {foldersData.recycleBin.map((item) => (
                                    <div key={item.id} class="hg-recycle-item">
                                        <div class="hg-recycle-item-content">
                                            <strong>{item.title || 'Untitled Item'}</strong>
                                            <span>
                                                {item.type === 'folder'
                                                    ? `${(item.folders || []).length} folder(s)`
                                                    : 'Chat'}
                                            </span>
                                        </div>
                                        <div class="hg-folder-actions">
                                            <button
                                                class="hg-folder-action-btn"
                                                type="button"
                                                onClick={() => restoreRecycleItem(item.id)}
                                            >
                                                Restore
                                            </button>
                                            <button
                                                class="hg-folder-delete"
                                                type="button"
                                                onClick={() =>
                                                    permanentlyDeleteRecycleItem(item.id)
                                                }
                                            >
                                                <FolderDeleteIcon width="16" height="16" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : selectedFolder ? (
                        isBulkAddOpen ? (
                            <div class="hg-bulk-add-panel">
                                <div class="hg-bulk-add-header">
                                    <input
                                        class="hg-bulk-search-input"
                                        type="text"
                                        placeholder="Search chats..."
                                        value={bulkSearch}
                                        onInput={(event) =>
                                            setBulkSearch(event.target.value)
                                        }
                                    />
                                    <button
                                        class="hg-folder-action-btn"
                                        type="button"
                                        onClick={() =>
                                            setBulkSelected(
                                                new Set(
                                                    visibleBulkCandidates.map(
                                                        (chat) => chat.id
                                                    )
                                                )
                                            )
                                        }
                                    >
                                        Select All
                                    </button>
                                </div>

                                <div class="hg-bulk-list">
                                    {visibleBulkCandidates.length === 0 ? (
                                        <div class="hg-empty-state">
                                            <p>No matching chats found</p>
                                        </div>
                                    ) : (
                                        visibleBulkCandidates.map((chat) => (
                                            <button
                                                key={chat.id}
                                                class="hg-bulk-item"
                                                type="button"
                                                onClick={() =>
                                                    toggleBulkSelection(chat.id)
                                                }
                                            >
                                                <span class="hg-folder-select-check">
                                                    {bulkSelected.has(chat.id)
                                                        ? '✓'
                                                        : ''}
                                                </span>
                                                <span class="hg-folder-select-name">
                                                    {chat.title}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>

                                <div class="hg-bulk-footer">
                                    <button
                                        class="hg-folder-action-btn"
                                        type="button"
                                        onClick={closeBulkAdd}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        class="hg-add-folder-btn"
                                        type="button"
                                        onClick={addSelectedBulkChats}
                                    >
                                        Add Selected ({bulkSelected.size})
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div class="hg-folder-chats">
                                {selectedFolderChildren.length > 0 && (
                                    <div class="hg-subfolder-section">
                                        <div class="hg-subfolder-section-title">
                                            Subfolders
                                        </div>
                                        {selectedFolderChildren.map((subfolder) => (
                                            <button
                                                key={subfolder.id}
                                                class="hg-subfolder-item"
                                                type="button"
                                                onClick={() => {
                                                    setSelectedFolderId(subfolder.id);
                                                    setIsBulkAddOpen(false);
                                                }}
                                            >
                                                <FolderFilledIcon
                                                    width="18"
                                                    height="18"
                                                    style={{ color: subfolder.color }}
                                                />
                                                <span class="hg-subfolder-name">
                                                    {subfolder.name}
                                                </span>
                                                <span class="hg-subfolder-count">
                                                    {subfolder.chats?.length || 0} chats
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {(selectedFolder.chats || []).length === 0 &&
                                selectedFolderChildren.length === 0 ? (
                                    <div class="hg-empty-state">
                                        <p>No chats in this folder yet</p>
                                    </div>
                                ) : (
                                    (selectedFolder.chats || []).map((chat) => (
                                        <div key={chat.id} class="hg-folder-chat-item">
                                            <a
                                                class="hg-folder-chat-link"
                                                href={chat.url || getAccountAwareUrl(chat.id)}
                                            >
                                                {chat.title || 'Untitled Chat'}
                                            </a>
                                            <button
                                                class="hg-folder-delete"
                                                type="button"
                                                onClick={() =>
                                                    removeChatFromFolder(
                                                        selectedFolder.id,
                                                        chat.id,
                                                        true
                                                    )
                                                }
                                            >
                                                <FolderDeleteIcon width="16" height="16" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )
                    ) : folders.length === 0 ? (
                        <div class="hg-empty-state">
                            <FolderEmptyIcon width="48" height="48" />
                            <p>No folders yet</p>
                        </div>
                    ) : (
                        renderFolderRows(null, 0)
                    )}
                </div>
            </div>
        </div>
    );
}
