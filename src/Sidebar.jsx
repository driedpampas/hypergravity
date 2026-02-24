import { useEffect, useState } from 'preact/hooks';
import SvgComponent from './Icon';
import './Sidebar.css';
import { useChromeStorage } from './hooks/useChromeStorage';
import { FoldersManager } from './FoldersManager';
import { SettingsModal } from './SettingsModal';
import { WelcomeModal } from './WelcomeModal';
import { WELCOME_SEEN_KEY } from './utils/constants';
import { readLocalStorageValue } from './utils/browserEnv';

export function Sidebar() {
    const [isExpanded, setIsExpanded] = useChromeStorage(
        'hypergravitySectionExpanded',
        true
    );
    // Use sync localStorage read as initial value to avoid flash-showing on reload
    const [welcomeSeen, setWelcomeSeen, isWelcomeLoaded] = useChromeStorage(
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
                <svg
                    class="hg-section-chevron"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
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
                >
                    <path d="M9 18l6-6-6-6" />
                </svg>
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
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            class="hg-dropdown-icon"
                        >
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
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
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                class="hg-dropdown-icon"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Welcome & Setup</span>
                        </div>
                    )}

                    <div
                        class="hg-dropdown-item"
                        onClick={() => setActiveMenu('settings')}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            class="hg-dropdown-icon"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
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
            {showWelcome && (
                <WelcomeModal onClose={handleWelcomeClose} />
            )}
        </div>
    );
}
