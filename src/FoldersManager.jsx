import { useState } from 'preact/hooks';
import { useStorage } from './hooks/useStorage';
import {
    FolderBackIcon,
    FolderAddIcon,
    FolderEmptyIcon,
    FolderFilledIcon,
    FolderDeleteIcon,
} from './icons';
import './FoldersManager.css';

export function FoldersManager({ onClose }) {
    const [folders, setFolders] = useStorage('hypergravityGeminiFolders', []);
    const [newFolderName, setNewFolderName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const resetAddFolderForm = () => {
        setNewFolderName('');
        setIsAdding(false);
    };

    const addFolder = () => {
        const folderName = newFolderName.trim();
        if (!folderName) return;

        const newFolder = {
            id: Date.now().toString(),
            name: folderName,
            color: '#4285f4',
            chats: [],
        };

        setFolders([...folders, newFolder]);
        resetAddFolderForm();
    };

    const deleteFolder = (id) => {
        setFolders(folders.filter((folder) => folder.id !== id));
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
                        <button class="hg-back-btn" onClick={onClose}>
                            <FolderBackIcon width="20" height="20" />
                        </button>
                        <h2>Folders Menu</h2>
                    </div>
                </div>

                <div class="hg-folders-toolbar">
                    {!isAdding ? (
                        <button
                            class="hg-add-folder-btn"
                            onClick={() => setIsAdding(true)}
                        >
                            <FolderAddIcon width="14" height="14" />
                            Add Folder
                        </button>
                    ) : (
                        <div class="hg-add-folder-form">
                            <input
                                autoFocus
                                type="text"
                                value={newFolderName}
                                onInput={(event) =>
                                    setNewFolderName(event.target.value)
                                }
                                onKeyDown={handleNewFolderKeyDown}
                                placeholder="Folder name..."
                            />
                            <button onClick={addFolder}>Save</button>
                            <button onClick={resetAddFolderForm}>Cancel</button>
                        </div>
                    )}
                </div>

                <div class="hg-folder-list">
                    {folders.length === 0 ? (
                        <div class="hg-empty-state">
                            <FolderEmptyIcon width="48" height="48" />
                            <p>No folders yet</p>
                        </div>
                    ) : (
                        folders.map((folder) => (
                            <div key={folder.id} class="hg-folder-item">
                                <div class="hg-folder-info">
                                    <FolderFilledIcon
                                        width="20"
                                        height="20"
                                        style={{ color: folder.color }}
                                    />
                                    <span>{folder.name}</span>
                                    <span class="hg-folder-count">
                                        {folder.chats?.length || 0} chats
                                    </span>
                                </div>
                                <button
                                    class="hg-folder-delete"
                                    onClick={() => deleteFolder(folder.id)}
                                >
                                    <FolderDeleteIcon width="16" height="16" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
