// @ts-nocheck
import { useEffect, useState } from 'preact/hooks';

import { useStorage } from '@hooks/useStorage';
import { SettingsModal } from '@src/SettingsModal';
import { WelcomeModal } from '@src/WelcomeModal';
import {
    ChevronRightIcon,
    WelcomeHandIcon,
    FolderEmptyIcon,
    SettingsGearIcon,
} from '@icons';
import { WELCOME_SEEN_KEY } from '@utils/constants';
import { FoldersManager } from '@modules/sidebar/FoldersManager';
import './Sidebar.css';

export function Sidebar() {
    const [isExpanded, setIsExpanded] = useStorage(
        'hypergravitySectionExpanded',
        true
    );
    const [welcomeSeen, setWelcomeSeen, isWelcomeLoaded] = useStorage(
        WELCOME_SEEN_KEY,
        false
    );
    const hasSeenWelcome = welcomeSeen === true;
    const [activeMenu, setActiveMenu] = useState(null);
    const [showWelcome, setShowWelcome] = useState(false);

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

    return (
        <div
            id="hg-hypergravity-section"
            class="hypergravity-sidebar-container"
        >
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
                            <WelcomeHandIcon class="hg-dropdown-icon" />
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
