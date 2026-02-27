import { getSettings } from '@content/helpers/settings';
import { showToast } from '@content/helpers/toast';
import { PICKER_OVERLAY_ID, PICKER_SEARCH_ID } from '@content/features/memories/constants';
import { fetchMemoryEntries } from '@content/features/memories/data';
import type { MemoryEntry } from '@content/features/memories/types';
import { chatBoxManager } from '@managers/chatBoxManager';

function prependMemoryToken(chatId: string) {
    const token = `<hg-chat-memories-${chatId}>`;
    const current = chatBoxManager.getInputText();

    if (!current.trim() || current.trim() === '@') {
        chatBoxManager.setInputText(`${token} `);
        return;
    }

    chatBoxManager.setInputText(`${token} ${current}`);
}

function createMemoryItemButton(entry: MemoryEntry, onSelect: (chatId: string) => void) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hg-memory-picker-item';

    const titleEl = document.createElement('span');
    titleEl.className = 'hg-memory-picker-item-title';
    titleEl.textContent = entry.title;

    const metaEl = document.createElement('span');
    metaEl.className = 'hg-memory-picker-item-meta';
    metaEl.textContent = entry.chatId;

    button.append(titleEl, metaEl);
    button.addEventListener('click', () => onSelect(entry.chatId));
    return button;
}

export function createMemoriesPickerController() {
    function closePicker() {
        document.getElementById(PICKER_OVERLAY_ID)?.remove();
    }

    async function openPicker() {
        const settings = await getSettings();
        if (!settings.chatMemoryEnabled) {
            showToast('Enable Chat Memory Summaries in Settings first.', 'info');
            return;
        }

        closePicker();

        const entries = await fetchMemoryEntries();
        if (entries.length === 0) {
            showToast('No saved chat memories found yet.', 'info');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = PICKER_OVERLAY_ID;
        overlay.className = 'hg-memory-picker-overlay';

        const modal = document.createElement('div');
        modal.className = 'hg-memory-picker-modal';

        const header = document.createElement('div');
        header.className = 'hg-memory-picker-header';

        const title = document.createElement('h3');
        title.textContent = 'Memories';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'hg-memory-picker-close';
        closeBtn.setAttribute('aria-label', 'Close memories picker');
        closeBtn.textContent = '✕';

        header.append(title, closeBtn);

        const searchWrap = document.createElement('div');
        searchWrap.className = 'hg-memory-picker-search-wrap';

        const searchInput = document.createElement('input');
        searchInput.id = PICKER_SEARCH_ID;
        searchInput.className = 'hg-memory-picker-search';
        searchInput.type = 'text';
        searchInput.placeholder = 'Search saved chat memories';

        searchWrap.appendChild(searchInput);

        const list = document.createElement('div');
        list.className = 'hg-memory-picker-list';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            closeWithCleanup();
        };

        const closeWithCleanup = () => {
            document.removeEventListener('keydown', onKeyDown);
            closePicker();
        };

        closeBtn.addEventListener('click', closeWithCleanup);

        const renderList = (query = '') => {
            list.innerHTML = '';

            const q = query.trim().toLowerCase();
            const filtered = !q
                ? entries
                : entries.filter(
                      (entry) =>
                          entry.title.toLowerCase().includes(q) ||
                          entry.chatId.toLowerCase().includes(q)
                  );

            if (filtered.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'hg-memory-picker-empty';
                empty.textContent = 'No matching chats found.';
                list.appendChild(empty);
                return;
            }

            for (const entry of filtered) {
                list.appendChild(
                    createMemoryItemButton(entry, (chatId) => {
                        prependMemoryToken(chatId);
                        closeWithCleanup();
                    })
                );
            }
        };

        searchInput.addEventListener('input', () => {
            renderList(searchInput.value);
        });

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                closeWithCleanup();
            }
        });

        modal.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        modal.append(header, searchWrap, list);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.addEventListener('keydown', onKeyDown);

        renderList();
        queueMicrotask(() => {
            document.getElementById(PICKER_SEARCH_ID)?.focus();
        });
    }

    return {
        openPicker,
        closePicker,
    };
}
