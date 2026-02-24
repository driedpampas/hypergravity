import { useEffect, useState } from 'preact/hooks';
import './Sidebar.css';
import { useStorage } from './hooks/useStorage';
import { FoldersManager } from './FoldersManager';
import { SettingsModal } from './SettingsModal';
import { WelcomeModal } from './WelcomeModal';
import {
    ChevronRightIcon,
    ClockCircleIcon,
    FolderEmptyIcon,
    SettingsGearIcon,
} from './icons';
import { WELCOME_SEEN_KEY } from './utils/constants';
import { readLocalStorageValue } from './utils/browserEnv';

export function Sidebar() {
    const [isExpanded, setIsExpanded] = useStorage(
        'hypergravitySectionExpanded',
        true
    );
    // Use sync localStorage read as initial value to avoid flash-showing on reload
    const [welcomeSeen, setWelcomeSeen, isWelcomeLoaded] = useStorage(
        WELCOME_SEEN_KEY,
        readLocalStorageValue(WELCOME_SEEN_KEY, false)
    );
    const hasSeenWelcome = welcomeSeen === true;
    const [activeMenu, setActiveMenu] = useState(null); // 'folders', 'settings'
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        if (isWelcomeLoaded && !hasSeenWelcome) {
            setShowWelcome(true);
        }
    }, [isWelcomeLoaded, hasSeenWelcome]);

    // Auto-show welcome on first install
    const handleWelcomeClose = () => {
        setWelcomeSeen(true);
        setShowWelcome(false);
        setActiveMenu(null);
    };

    const toggleSection = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div
            id="hg-hypergravity-section"
            class="hypergravity-sidebar-container"
        >
            {/* Header section (Toggle) */}
            <div
                class="hg-section-header"
                onClick={toggleSection}
                role="button"
                tabIndex={0}
            >
                <div class="hg-section-header-left">
                    <span class="hg-section-title">hypergravity</span>
                </div>
                <ChevronRightIcon
                    class="hg-section-chevron"
                    style={{
                        width: '16px',
                        height: '16px',
                        color: '#727676',
                        transform: isExpanded
                            ? 'rotate(90deg)'
                            : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        marginRight: '-5px',
                    }}
                />
            </div>

            {/* Expanded Content View (Menu) */}
            <div
                class="hg-section-content"
                style={{
                    maxHeight: isExpanded ? '200px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.2s ease',
                }}
            >
                <div class="hg-dropdown-menu">
                    <div
                        class="hg-dropdown-item"
                        onClick={() => setActiveMenu('folders')}
                    >
                        <FolderEmptyIcon class="hg-dropdown-icon" />
                        <span>Folders</span>
                    </div>

                    {isWelcomeLoaded && !hasSeenWelcome && (
                        <div
                            class="hg-dropdown-item"
                            onClick={() => {
                                setActiveMenu(null);
                                setShowWelcome(true);
                            }}
                        >
                            <ClockCircleIcon class="hg-dropdown-icon" />
                            <span>Welcome & Setup</span>
                        </div>
                    )}

                    <div
                        class="hg-dropdown-item"
                        onClick={() => setActiveMenu('settings')}
                    >
                        <SettingsGearIcon class="hg-dropdown-icon" />
                        <span>Settings</span>
                    </div>
                </div>
            </div>

            {activeMenu === 'folders' && (
                <FoldersManager onClose={() => setActiveMenu(null)} />
            )}
            {activeMenu === 'settings' && (
                <SettingsModal onClose={() => setActiveMenu(null)} />
            )}
            {showWelcome && <WelcomeModal onClose={handleWelcomeClose} />}
        </div>
    );
}
