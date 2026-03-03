import { useStorage } from '@hooks/useStorage';
import {
    ChevronRightIcon,
    FolderEmptyIcon,
    HypergravityIcon,
    SettingsGearIcon,
    SmallMemoriesIcon,
    WelcomeHandIcon,
} from '@icons';
import { FoldersManager } from '@modules/sidebar/FoldersManager';
import { MemoriesModal } from '@modules/sidebar/MemoriesModal';
import { SettingsModal } from '@modules/sidebar/SettingsModal';
import { WelcomeModal } from '@modules/sidebar/WelcomeModal';
import { DEFAULT_SETTINGS, SETTINGS_KEY, WELCOME_SEEN_KEY } from '@utils/constants';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import './Sidebar.css';

type ActiveMenu = 'folders' | 'memories' | 'settings' | null;

export function Sidebar() {
    const [isExpanded, setIsExpanded] = useStorage('hypergravitySectionExpanded', true);
    const [welcomeSeen, setWelcomeSeen, isWelcomeLoaded] = useStorage(WELCOME_SEEN_KEY, false);
    const [settings] = useStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
    const hasSeenWelcome = welcomeSeen === true;
    const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const sidebarThemedIconClass = settings.themeSidebarIcons ? 'hg-sidebar-themed-icon' : '';

    useEffect(() => {
        if (isWelcomeLoaded && !hasSeenWelcome) {
            setShowWelcome(true);
        }
    }, [isWelcomeLoaded, hasSeenWelcome]);

    const handleWelcomeClose = () => {
        setWelcomeSeen(true);
        setShowWelcome(false);
        setActiveMenu(null);
    };

    const toggleSection = () => {
        setIsExpanded(!isExpanded);
    };

    const handleMemoriesClick = () => {
        setActiveMenu('memories');
    };

    useEffect(() => {
        let mountedContainer: HTMLElement | null = null;
        let mountedActionsRoot: HTMLElement | null = null;
        let watchedSidebarContainer: HTMLElement | null = null;
        let sidebarClassObserver: MutationObserver | null = null;

        const handleCollapsedActionClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            const button = target?.closest<HTMLButtonElement>('.hg-collapsed-sidebar-action');
            if (!button || !mountedActionsRoot?.contains(button)) return;

            event.preventDefault();
            event.stopPropagation();

            const action = button.dataset.hgAction;
            if (action === 'folders') {
                setActiveMenu('folders');
                return;
            }

            if (action === 'memories') {
                if (settings.chatMemoryEnabled) {
                    handleMemoriesClick();
                }
                return;
            }

            if (action === 'settings') {
                setActiveMenu('settings');
            }
        };

        const removeCollapsedActions = () => {
            if (mountedActionsRoot) {
                mountedActionsRoot.removeEventListener('click', handleCollapsedActionClick);
                render(null, mountedActionsRoot);
                mountedActionsRoot.remove();
                mountedActionsRoot = null;
                mountedContainer = null;
            }
        };

        const renderCollapsedActions = (container: HTMLElement) => {
            if (!mountedActionsRoot || mountedContainer !== container) {
                removeCollapsedActions();
                mountedActionsRoot = document.createElement('div');
                mountedActionsRoot.id = 'hg-collapsed-sidebar-actions';
                mountedActionsRoot.className = 'hg-collapsed-sidebar-actions';
                mountedActionsRoot.addEventListener('click', handleCollapsedActionClick);
                container.appendChild(mountedActionsRoot);
                mountedContainer = container;
            }

            render(
                <>
                    {settings.foldersEnabled && (
                        <button
                            class="hg-collapsed-sidebar-action"
                            type="button"
                            title="Folders"
                            aria-label="Folders"
                            data-hg-action="folders"
                        >
                            <FolderEmptyIcon class="hg-dropdown-icon" />
                        </button>
                    )}

                    {settings.chatMemoryEnabled && (
                        <button
                            class="hg-collapsed-sidebar-action"
                            type="button"
                            title="Memories"
                            aria-label="Memories"
                            data-hg-action="memories"
                        >
                            <SmallMemoriesIcon
                                class={`hg-dropdown-icon ${sidebarThemedIconClass}`.trim()}
                            />
                        </button>
                    )}

                    <button
                        class="hg-collapsed-sidebar-action"
                        type="button"
                        title="Settings"
                        aria-label="Settings"
                        data-hg-action="settings"
                    >
                        <SettingsGearIcon class="hg-dropdown-icon" />
                    </button>
                </>,
                mountedActionsRoot
            );
        };

        const syncCollapsedActions = () => {
            const sidebarContainer = document.querySelector<HTMLElement>(
                '.sidenav-with-history-container.content-loaded'
            );

            const shouldShowCollapsedActions =
                Boolean(settings.showCollapsedSidebarButtons) &&
                Boolean(sidebarContainer?.classList.contains('collapsed'));

            if (!shouldShowCollapsedActions) {
                removeCollapsedActions();
                return;
            }

            const actionList = sidebarContainer?.querySelector<HTMLElement>('mat-action-list');
            if (!actionList) {
                removeCollapsedActions();
                return;
            }

            renderCollapsedActions(actionList);
        };

        const watchSidebarContainer = (container: HTMLElement | null) => {
            if (watchedSidebarContainer === container) {
                return;
            }

            if (sidebarClassObserver) {
                sidebarClassObserver.disconnect();
                sidebarClassObserver = null;
            }

            watchedSidebarContainer = container;

            if (watchedSidebarContainer) {
                sidebarClassObserver = new MutationObserver(syncCollapsedActions);
                sidebarClassObserver.observe(watchedSidebarContainer, {
                    attributes: true,
                    attributeFilter: ['class'],
                });
            }
        };

        const bodyObserver = new MutationObserver(() => {
            const sidebarContainer = document.querySelector<HTMLElement>(
                '.sidenav-with-history-container.content-loaded'
            );
            watchSidebarContainer(sidebarContainer);
            syncCollapsedActions();
        });

        watchSidebarContainer(
            document.querySelector<HTMLElement>('.sidenav-with-history-container.content-loaded')
        );
        syncCollapsedActions();

        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });

        return () => {
            bodyObserver.disconnect();
            if (sidebarClassObserver) {
                sidebarClassObserver.disconnect();
            }
            removeCollapsedActions();
        };
    }, [settings.foldersEnabled, settings.chatMemoryEnabled, settings.showCollapsedSidebarButtons]);

    return (
        <div
            id="hg-hypergravity-section"
            class="hypergravity-sidebar-container"
            data-expanded={isExpanded ? 'true' : 'false'}
        >
            <button class="hg-section-header" type="button" onClick={toggleSection}>
                <div class="hg-section-header-left">
                    <HypergravityIcon
                        key={settings.themeSidebarIcons ? 'sidebar-themed' : 'sidebar-default'}
                        class={`hg-section-title-icon ${sidebarThemedIconClass}`.trim()}
                        monochrome={settings.themeSidebarIcons}
                    />
                    <span class="hg-section-title">hypergravity</span>
                </div>
                <ChevronRightIcon
                    class="hg-section-chevron"
                    style={{
                        width: '16px',
                        height: '16px',
                        color: '#727676',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        marginRight: '-5px',
                    }}
                />
            </button>

            <div
                class="hg-section-content"
                style={{
                    maxHeight: isExpanded ? '200px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.2s ease',
                }}
            >
                <div class="hg-dropdown-menu">
                    <button
                        class="hg-dropdown-item"
                        type="button"
                        onClick={() => setActiveMenu('folders')}
                    >
                        <FolderEmptyIcon class="hg-dropdown-icon" />
                        <span>Folders</span>
                    </button>

                    {settings.chatMemoryEnabled && (
                        <button
                            class="hg-dropdown-item"
                            type="button"
                            onClick={handleMemoriesClick}
                        >
                            <SmallMemoriesIcon
                                class={`hg-dropdown-icon ${sidebarThemedIconClass}`.trim()}
                            />
                            <span>Memories</span>
                        </button>
                    )}

                    {isWelcomeLoaded && !hasSeenWelcome && (
                        <button
                            class="hg-dropdown-item"
                            type="button"
                            onClick={() => {
                                setActiveMenu(null);
                                setShowWelcome(true);
                            }}
                        >
                            <WelcomeHandIcon class="hg-dropdown-icon" />
                            <span>Welcome & Setup</span>
                        </button>
                    )}

                    <button
                        class="hg-dropdown-item"
                        type="button"
                        onClick={() => setActiveMenu('settings')}
                    >
                        <SettingsGearIcon class="hg-dropdown-icon" />
                        <span>Settings</span>
                    </button>
                </div>
            </div>

            {activeMenu === 'folders' && <FoldersManager onClose={() => setActiveMenu(null)} />}
            {activeMenu === 'memories' && settings.chatMemoryEnabled && (
                <MemoriesModal onClose={() => setActiveMenu(null)} />
            )}
            {activeMenu === 'settings' && <SettingsModal onClose={() => setActiveMenu(null)} />}
            {showWelcome && <WelcomeModal onClose={handleWelcomeClose} />}
        </div>
    );
}
