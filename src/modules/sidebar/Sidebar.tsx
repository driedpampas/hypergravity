import { useStorage } from '@hooks/useStorage';
import {
    ChevronRightIcon,
    FolderEmptyIcon,
    SettingsGearIcon,
    SmallMemoriesIcon,
    WelcomeHandIcon,
} from '@icons';
import { FoldersManager } from '@modules/sidebar/FoldersManager';
import { MemoriesModal } from '@modules/sidebar/MemoriesModal';
import { SettingsModal } from '@modules/sidebar/SettingsModal';
import { WelcomeModal } from '@modules/sidebar/WelcomeModal';
import { WELCOME_SEEN_KEY } from '@utils/constants';
import { useEffect, useState } from 'preact/hooks';
import './Sidebar.css';

type ActiveMenu = 'folders' | 'memories' | 'settings' | null;

export function Sidebar() {
    const [isExpanded, setIsExpanded] = useStorage('hypergravitySectionExpanded', true);
    const [welcomeSeen, setWelcomeSeen, isWelcomeLoaded] = useStorage(WELCOME_SEEN_KEY, false);
    const hasSeenWelcome = welcomeSeen === true;
    const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
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

    const handleMemoriesClick = () => {
        setActiveMenu('memories');
    };

    return (
        <div id="hg-hypergravity-section" class="hypergravity-sidebar-container">
            <button class="hg-section-header" type="button" onClick={toggleSection}>
                <div class="hg-section-header-left">
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

                    <button class="hg-dropdown-item" type="button" onClick={handleMemoriesClick}>
                        <SmallMemoriesIcon class="hg-dropdown-icon" />
                        <span>Memories</span>
                    </button>

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
            {activeMenu === 'memories' && <MemoriesModal onClose={() => setActiveMenu(null)} />}
            {activeMenu === 'settings' && <SettingsModal onClose={() => setActiveMenu(null)} />}
            {showWelcome && <WelcomeModal onClose={handleWelcomeClose} />}
        </div>
    );
}
