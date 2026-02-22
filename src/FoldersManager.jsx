import React, { useState, useEffect } from 'react';
import { useChromeStorage } from './hooks/useChromeStorage';
import './FoldersManager.css';

export function FoldersManager({ onClose }) {
  const [folders, setFolders] = useChromeStorage('hypergravityGeminiFolders', []);
  const [chats, setChats] = useState([]); // This would potentially sync with the extension's tracked chats
  const [newFolderName, setNewFolderName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const addFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      color: '#4285f4', // Default color
      chats: []
    };
    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setIsAdding(false);
  };

  const deleteFolder = (id) => {
    setFolders(folders.filter(f => f.id !== id));
  };

  return (
    <div className="sg-folders-modal">
      <div className="sg-folders-header">
        <div className="sg-folders-header-left">
          <button className="sg-back-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <h2>Folders Menu</h2>
        </div>
      </div>
      
      <div className="sg-folders-toolbar">
         {!isAdding ? (
             <button className="sg-add-folder-btn" onClick={() => setIsAdding(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 5v14M5 12h14"/>
                </svg>
                Add Folder
             </button>
         ) : (
             <div className="sg-add-folder-form">
                 <input 
                    autoFocus
                    type="text" 
                    value={newFolderName} 
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addFolder()}
                    placeholder="Folder name..." 
                 />
                 <button onClick={addFolder}>Save</button>
                 <button onClick={() => setIsAdding(false)}>Cancel</button>
             </div>
         )}
      </div>

      <div className="sg-folder-list">
        {folders.length === 0 ? (
            <div className="sg-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <p>No folders yet</p>
            </div>
        ) : (
            folders.map(folder => (
                <div key={folder.id} className="sg-folder-item">
                    <div className="sg-folder-info">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style={{color: folder.color}}>
                            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                        </svg>
                        <span>{folder.name}</span>
                        <span className="sg-folder-count">{folder.chats?.length || 0} chats</span>
                    </div>
                    <button className="sg-folder-delete" onClick={() => deleteFolder(folder.id)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            ))
        )}
      </div>
    </div>
  );
}
