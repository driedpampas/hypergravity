import { CHAT_MEMORY_PREFIX } from '@features/memories/constants';
import { fetchMemoryEntries } from '@features/memories/data';
import type { MemoryEntry } from '@features/memories/types';
import { BackArrowIcon, ChevronRightIcon } from '@icons';
import type { ChatMemoryRecord, MemorySummaryStructured } from '@shared/contracts/runtimeMessages';
import { getIdbValue, removeIdbValue, setIdbValue } from '@utils/idbStorage';
import { useCallback, useEffect, useState } from 'preact/hooks';
import './MemoriesModal.css';

type ModalProps = {
    onClose: () => void;
};

type FullMemory = ChatMemoryRecord & { chatTitle?: string };
type ViewState = { type: 'list' } | { type: 'detail'; entry: MemoryEntry };

function formatDate(timestamp: number): string {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

const STRUCTURED_MEMORY_SECTIONS: Array<{
    key: keyof MemorySummaryStructured;
    label: string;
}> = [
    { key: 'context', label: 'Context' },
    { key: 'userPreferences', label: 'User Preferences' },
    { key: 'decisions', label: 'Decisions' },
    { key: 'openThreads', label: 'Open Threads' },
    { key: 'nextUsefulActions', label: 'Next Useful Actions' },
];

export function MemoriesModal({ onClose }: ModalProps) {
    const [viewState, setViewState] = useState<ViewState>({ type: 'list' });
    const [entries, setEntries] = useState<MemoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Detail view state
    const [detailLoading, setDetailLoading] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editSummary, setEditSummary] = useState('');
    const [fullRecord, setFullRecord] = useState<FullMemory | null>(null);
    const [detectedTitleAtOpen, setDetectedTitleAtOpen] = useState('');
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [dirty, setDirty] = useState(false);

    const loadEntries = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchMemoryEntries();
            setEntries(result);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadEntries();
    }, [loadEntries]);

    const openDetail = async (entry: MemoryEntry) => {
        setViewState({ type: 'detail', entry });
        setDetailLoading(true);
        setConfirmDelete(false);
        setDirty(false);
        try {
            const record = (await getIdbValue(
                CHAT_MEMORY_PREFIX + entry.chatId,
                null
            )) as FullMemory | null;
            setFullRecord(record);
            setDetectedTitleAtOpen(String(record?.detectedChatTitle || '').trim());
            setEditTitle(String(record?.chatTitle || '').trim() || entry.title);
            setEditSummary(String(record?.summary || '').trim());
        } finally {
            setDetailLoading(false);
        }
    };

    const handleBack = () => {
        if (viewState.type === 'detail') {
            setViewState({ type: 'list' });
            setConfirmDelete(false);
            setDirty(false);
        } else {
            onClose();
        }
    };

    const handleSave = async () => {
        if (viewState.type !== 'detail' || !fullRecord) return;
        setSaving(true);
        try {
            const normalizedTitle = editTitle.trim();
            const hasDetectedTitle = Boolean(detectedTitleAtOpen);
            const chatTitleUserModified = hasDetectedTitle
                ? normalizedTitle !== detectedTitleAtOpen
                : fullRecord.chatTitleUserModified === true;

            const updated: FullMemory = {
                ...fullRecord,
                chatTitle: normalizedTitle || undefined,
                chatTitleUserModified,
                summary: editSummary,
            };
            await setIdbValue(CHAT_MEMORY_PREFIX + viewState.entry.chatId, updated);
            setDirty(false);
            await loadEntries();
            setViewState({ type: 'list' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (entry: MemoryEntry) => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        await removeIdbValue(CHAT_MEMORY_PREFIX + entry.chatId);
        await loadEntries();
        setViewState({ type: 'list' });
        setConfirmDelete(false);
    };

    const filteredEntries = entries.filter((entry) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return entry.title.toLowerCase().includes(q) || entry.chatId.toLowerCase().includes(q);
    });

    const headerTitle =
        viewState.type === 'detail' ? viewState.entry.title || 'Memory Detail' : 'Memories';

    const structuredSummary = fullRecord?.summaryStructured;

    return (
        // biome-ignore lint/a11y/useSemanticElements: it's a dialog overlay.
        <div
            class="hg-dialog-overlay"
            role="button"
            tabIndex={0}
            aria-label="Close memories dialog"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    handleBack();
                }
            }}
        >
            <div
                class="hg-settings-modal hg-memories-modal"
                role="dialog"
                aria-modal="true"
                aria-label={headerTitle}
            >
                <div class="hg-settings-header">
                    <div class="hg-settings-header-left">
                        <button class="hg-back-btn" type="button" onClick={handleBack}>
                            <BackArrowIcon width="20" height="20" />
                        </button>
                        <h2>{headerTitle}</h2>
                    </div>
                </div>

                <div class="hg-settings-body">
                    {viewState.type === 'list' ? (
                        <div class="hg-memories-list-view">
                            <div class="hg-memories-search-wrap">
                                <input
                                    type="text"
                                    class="hg-memories-search"
                                    placeholder="Search memories…"
                                    value={searchQuery}
                                    onInput={(e) => setSearchQuery(e.currentTarget.value)}
                                    autoComplete="off"
                                />
                            </div>
                            {loading ? (
                                <div class="hg-memories-empty">Loading memories…</div>
                            ) : filteredEntries.length === 0 ? (
                                <div class="hg-memories-empty">
                                    {searchQuery
                                        ? 'No matching memories found.'
                                        : 'No saved memories yet.'}
                                </div>
                            ) : (
                                <div class="hg-memories-list">
                                    {filteredEntries.map((entry) => (
                                        <button
                                            key={entry.chatId}
                                            class="hg-memories-list-item"
                                            type="button"
                                            onClick={() => void openDetail(entry)}
                                        >
                                            <div class="hg-memories-item-info">
                                                <span class="hg-memories-item-title">
                                                    {entry.title}
                                                </span>
                                                <span class="hg-memories-item-meta">
                                                    {entry.updatedAt
                                                        ? formatDate(entry.updatedAt)
                                                        : entry.chatId.slice(0, 16)}
                                                </span>
                                            </div>
                                            <ChevronRightIcon
                                                class="hg-memories-item-chevron"
                                                width="16"
                                                height="16"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div class="hg-memories-detail-view">
                            {detailLoading ? (
                                <div class="hg-memories-empty">Loading…</div>
                            ) : (
                                <>
                                    <div class="hg-memories-field">
                                        <label
                                            class="hg-memories-field-label"
                                            htmlFor="hg-memory-title-input"
                                        >
                                            Name
                                        </label>
                                        <input
                                            id="hg-memory-title-input"
                                            type="text"
                                            class="hg-memories-field-input"
                                            value={editTitle}
                                            onInput={(e) => {
                                                setEditTitle(e.currentTarget.value);
                                                setDirty(true);
                                            }}
                                            placeholder="Memory name"
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div class="hg-memories-field hg-memories-field-grow">
                                        {structuredSummary ? (
                                            <div class="hg-memories-structured-wrap">
                                                {STRUCTURED_MEMORY_SECTIONS.map((section) => {
                                                    const items =
                                                        structuredSummary[section.key] || [];
                                                    return (
                                                        <div
                                                            class="hg-memories-structured-section"
                                                            key={section.key}
                                                        >
                                                            <h3 class="hg-memories-structured-title">
                                                                {section.label}
                                                            </h3>
                                                            {items.length > 0 ? (
                                                                <ul class="hg-memories-structured-list">
                                                                    {items.map((item, index) => (
                                                                        <li
                                                                            class="hg-memories-structured-item"
                                                                            key={`${section.key}-${String(index)}-${item}`}
                                                                        >
                                                                            {item}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <div class="hg-memories-structured-empty">
                                                                    None
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : null}

                                        <label
                                            class="hg-memories-field-label"
                                            htmlFor="hg-memory-summary-textarea"
                                        >
                                            {structuredSummary ? 'Raw Summary' : 'Summary'}
                                        </label>
                                        <textarea
                                            id="hg-memory-summary-textarea"
                                            class="hg-memories-field-textarea"
                                            value={editSummary}
                                            onInput={(e) => {
                                                setEditSummary(e.currentTarget.value);
                                                setDirty(true);
                                            }}
                                            placeholder="Memory summary content"
                                        />
                                    </div>
                                    <div class="hg-memories-meta-row">
                                        <span class="hg-memories-meta-item">
                                            {viewState.entry.chatId.slice(0, 18)}
                                        </span>
                                        {fullRecord?.updatedAt ? (
                                            <span class="hg-memories-meta-item">
                                                {formatDate(fullRecord.updatedAt)}
                                            </span>
                                        ) : null}
                                        {fullRecord?.messageCount ? (
                                            <span class="hg-memories-meta-item">
                                                {fullRecord.messageCount} msgs
                                            </span>
                                        ) : null}
                                    </div>
                                    <div class="hg-memories-detail-actions">
                                        <button
                                            class={`hg-memories-btn hg-memories-btn-delete${confirmDelete ? ' hg-memories-btn-confirm' : ''}`}
                                            type="button"
                                            onClick={() => void handleDelete(viewState.entry)}
                                        >
                                            {confirmDelete ? 'Confirm delete' : 'Delete'}
                                        </button>
                                        <button
                                            class="hg-memories-btn hg-memories-btn-save"
                                            type="button"
                                            onClick={() => void handleSave()}
                                            disabled={saving || !dirty}
                                        >
                                            {saving ? 'Saving…' : 'Save'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
