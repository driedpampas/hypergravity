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
import { HiddenChatsModal } from '@modules/sidebar/HiddenChatsModal';
import { MemoriesModal } from '@modules/sidebar/MemoriesModal';
import { SettingsModal } from '@modules/sidebar/SettingsModal';
import { WelcomeModal } from '@modules/sidebar/WelcomeModal';
import { DEFAULT_SETTINGS, SETTINGS_KEY, WELCOME_SEEN_KEY } from '@utils/constants';
import { useEffect, useRef, useState } from 'preact/hooks';
import './Sidebar.css';

type ActiveMenu = 'folders' | 'memories' | 'settings' | 'hidden-chats' | null;

const SETTINGS_LONG_PRESS_MS = 700;

export function Sidebar() {
    const [isExpanded, setIsExpanded] = useStorage('hypergravitySectionExpanded', true);
    const [welcomeSeen, setWelcomeSeen, isWelcomeLoaded] = useStorage(WELCOME_SEEN_KEY, false);
    const [settings] = useStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
    const hasSeenWelcome = welcomeSeen === true;
    const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const sidebarThemedIconClass = settings.themeSidebarIcons ? 'hg-sidebar-themed-icon' : '';
    const settingsLongPressTimerRef = useRef<number | null>(null);
    const didOpenHiddenChatsRef = useRef(false);

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

    const clearSettingsLongPressTimer = () => {
        if (settingsLongPressTimerRef.current !== null) {
            window.clearTimeout(settingsLongPressTimerRef.current);
            settingsLongPressTimerRef.current = null;
        }
    };

    const handleSettingsPressStart = () => {
        didOpenHiddenChatsRef.current = false;
        clearSettingsLongPressTimer();

        settingsLongPressTimerRef.current = window.setTimeout(() => {
            didOpenHiddenChatsRef.current = true;
            setActiveMenu('hidden-chats');
        }, SETTINGS_LONG_PRESS_MS);
    };

    const handleSettingsPressEnd = () => {
        clearSettingsLongPressTimer();
    };

    useEffect(() => {
        return () => {
            clearSettingsLongPressTimer();
        };
    }, []);

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
                        onPointerDown={handleSettingsPressStart}
                        onPointerUp={handleSettingsPressEnd}
                        onPointerLeave={handleSettingsPressEnd}
                        onPointerCancel={handleSettingsPressEnd}
                        onClick={() => {
                            if (didOpenHiddenChatsRef.current) {
                                didOpenHiddenChatsRef.current = false;
                                return;
                            }

                            setActiveMenu('settings');
                        }}
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
            {activeMenu === 'hidden-chats' && (
                <HiddenChatsModal onClose={() => setActiveMenu(null)} />
            )}
            {showWelcome && <WelcomeModal onClose={handleWelcomeClose} />}
        </div>
    );
}
