import { useState } from 'preact/hooks';
import { useStorage } from './hooks/useStorage';
import {
    BackArrowIcon,
    ChatKeyIcon,
    CheckIcon,
    ChevronRightIcon,
    ClockCircleIcon,
    FolderListIcon,
    InfoAlertCircleIcon,
    LockIcon,
    MenuLinesIcon,
} from './icons';
import { SETTINGS_KEY, DEFAULT_SETTINGS } from './utils/constants';
import './WelcomeModal.css';

const TOTAL_STEPS = 2;

export function WelcomeModal({ onClose }) {
    const [step, setStep] = useState(0);
    const [settings, setSettings] = useStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
    const [apiKeyDraft, setApiKeyDraft] = useState('');
    const [keyCopied, setKeyCopied] = useState(false);
    const [wantsApiKey, setWantsApiKey] = useState(null);

    const saveAndClose = () => {
        if (apiKeyDraft.trim()) {
            setSettings({ ...settings, geminiApiKey: apiKeyDraft.trim() });
        }
        onClose();
    };

    const handleApiKeyInput = (e) => {
        setApiKeyDraft(e.target.value);
    };

    const handleApiKeySave = () => {
        if (apiKeyDraft.trim()) {
            setSettings({ ...settings, geminiApiKey: apiKeyDraft.trim() });
            setKeyCopied(true);
            setTimeout(() => setKeyCopied(false), 2000);
        }
    };

    const currentApiKey = apiKeyDraft || settings.geminiApiKey || '';

    const Overview = () => (
        <div class="hg-welcome-step">
            <div class="hg-welcome-hero">
                <div class="hg-welcome-icon-ring">
                    <ClockCircleIcon width="32" height="32" />
                </div>
                <h2 class="hg-welcome-title">Welcome to Hypergravity</h2>
                <p class="hg-welcome-subtitle">
                    Hypergravity adds practical quality-of-life tools to Gemini
                    so everyday chat workflows are faster and easier to manage.
                </p>
            </div>

            <div class="hg-welcome-feature-list">
                <div class="hg-welcome-feature">
                    <div class="hg-welcome-feature-icon">
                        <InfoAlertCircleIcon width="20" height="20" />
                    </div>
                    <div class="hg-welcome-feature-text">
                        <strong>Token Counter + Context Ring</strong>
                        <span>
                            Estimates the number of tokens in your conversation
                            so you know how close you are to your context limit.
                            Uses a fast local estimate by default, or exact
                            counts from the Gemini API when you add an API key.
                        </span>
                    </div>
                </div>

                <div class="hg-welcome-feature">
                    <div class="hg-welcome-feature-icon">
                        <MenuLinesIcon width="20" height="20" />
                    </div>
                    <div class="hg-welcome-feature-text">
                        <strong>Chat Productivity Tools</strong>
                        <span>
                            Includes quick actions, word counting, scroll
                            controls, and optional prompt optimization directly
                            near the chat input.
                        </span>
                    </div>
                </div>

                <div class="hg-welcome-feature">
                    <div class="hg-welcome-feature-icon">
                        <FolderListIcon width="20" height="20" />
                    </div>
                    <div class="hg-welcome-feature-text">
                        <strong>Organization + Layout Controls</strong>
                        <span>
                            Use folders, wide mode, export actions, and
                            sidebar/chatbox display settings to match your
                            preferred Gemini workspace.
                        </span>
                    </div>
                </div>

                <div class="hg-welcome-feature">
                    <div class="hg-welcome-feature-icon">
                        <LockIcon width="20" height="20" />
                    </div>
                    <div class="hg-welcome-feature-text">
                        <strong>Private by Default</strong>
                        <span>
                            Any Gemini API key you add is stored locally in your
                            browser and only used for direct Gemini token
                            counting requests.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    const ApiKeySetup = () => (
        <div class="hg-welcome-step">
            <div class="hg-welcome-hero hg-welcome-hero--compact">
                <div class="hg-welcome-icon-ring">
                    <ChatKeyIcon width="28" height="28" />
                </div>
                <h2 class="hg-welcome-title">Get a Gemini API Key</h2>
                <p class="hg-welcome-subtitle">
                    Want exact token counts instead of estimates? You can add a
                    free Gemini API key now, or skip this and do it later.
                </p>
            </div>

            {wantsApiKey === null && (
                <div class="hg-welcome-choice-card">
                    <p class="hg-welcome-choice-text">
                        Would you like to add a Gemini API key now?
                    </p>
                    <div class="hg-welcome-choice-actions">
                        <button
                            class="hg-welcome-choice-btn hg-welcome-choice-btn--secondary"
                            onClick={() => setWantsApiKey(false)}
                        >
                            Not now
                        </button>
                        <button
                            class="hg-welcome-choice-btn hg-welcome-choice-btn--primary"
                            onClick={() => setWantsApiKey(true)}
                        >
                            Yes, show steps
                        </button>
                    </div>
                </div>
            )}

            {wantsApiKey === true && (
                <>
                    <ol class="hg-welcome-steps">
                        <li class="hg-welcome-step-item">
                            <span class="hg-welcome-step-num">1</span>
                            <div class="hg-welcome-step-body">
                                <strong>Open Google AI Studio</strong>
                                <span>
                                    Go to your projects page and sign in with
                                    your Google account.
                                </span>
                                <a
                                    class="hg-welcome-link"
                                    href="https://aistudio.google.com/projects"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    aistudio.google.com/projects ↗
                                </a>
                            </div>
                        </li>

                        <li class="hg-welcome-step-item">
                            <span class="hg-welcome-step-num">2</span>
                            <div class="hg-welcome-step-body">
                                <strong>Select or create a project</strong>
                                <span>
                                    Each project has a <em>Keys</em> column.
                                    Click the key count for an existing project,
                                    or create a new project first.
                                </span>
                            </div>
                        </li>

                        <li class="hg-welcome-step-item">
                            <span class="hg-welcome-step-num">3</span>
                            <div class="hg-welcome-step-body">
                                <strong>Copy or create a key</strong>
                                <span>
                                    If the project already has API keys listed,
                                    click the copy icon next to one. If the list
                                    is empty, click{' '}
                                    <strong>Create API key</strong> and copy the
                                    value shown.
                                </span>
                            </div>
                        </li>

                        <li class="hg-welcome-step-item">
                            <span class="hg-welcome-step-num">4</span>
                            <div class="hg-welcome-step-body">
                                <strong>Paste it below</strong>
                                <span>
                                    The key starts with <code>AIza</code>. You
                                    can also update it later in Settings.
                                </span>
                                <div class="hg-welcome-key-row">
                                    <input
                                        type="text"
                                        class="hg-welcome-key-input"
                                        value={currentApiKey}
                                        onInput={handleApiKeyInput}
                                        placeholder="AIza..."
                                        spellCheck={false}
                                        autoComplete="off"
                                    />
                                    <button
                                        class={`hg-welcome-save-btn ${keyCopied ? 'hg-welcome-save-btn--saved' : ''}`}
                                        onClick={handleApiKeySave}
                                        disabled={
                                            !apiKeyDraft.trim() ||
                                            apiKeyDraft.trim() ===
                                                settings.geminiApiKey
                                        }
                                    >
                                        {keyCopied ? (
                                            <>
                                                <CheckIcon
                                                    width="14"
                                                    height="14"
                                                />
                                                Saved
                                            </>
                                        ) : (
                                            'Save'
                                        )}
                                    </button>
                                </div>
                                {settings.geminiApiKey && !apiKeyDraft && (
                                    <span class="hg-welcome-key-saved-note">
                                        <CheckIcon width="12" height="12" />
                                        API key is already saved
                                    </span>
                                )}
                            </div>
                        </li>
                    </ol>
                </>
            )}

            {wantsApiKey === false && (
                <div class="hg-welcome-choice-card hg-welcome-choice-card--muted">
                    <p class="hg-welcome-choice-text">
                        No problem — token counts still work in estimate mode.
                        You can add an API key later from{' '}
                        <strong>Settings → Gemini API Key</strong>.
                    </p>
                    <div
                        class="hg-welcome-later-note"
                        role="status"
                        aria-live="polite"
                    >
                        <strong>Reminder:</strong> You can always add this later
                        from Settings.
                    </div>
                    <button
                        class="hg-welcome-choice-btn hg-welcome-choice-btn--secondary"
                        onClick={() => setWantsApiKey(true)}
                    >
                        Show key setup anyway
                    </button>
                </div>
            )}

            <p class="hg-welcome-footer-note">
                Adding a key is optional. Hypergravity works without one, and
                you can change this any time in Settings.
            </p>
        </div>
    );

    return (
        <div class="hg-welcome-modal">
            {/* Header */}
            <div class="hg-welcome-header">
                <button
                    class="hg-back-btn"
                    onClick={saveAndClose}
                    title="Close"
                >
                    <BackArrowIcon width="20" height="20" />
                </button>
                {/* Step dots */}
                <div class="hg-welcome-dots">
                    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                        <button
                            key={i}
                            class={`hg-welcome-dot ${i === step ? 'active' : ''}`}
                            onClick={() => setStep(i)}
                            aria-label={`Step ${i + 1}`}
                        />
                    ))}
                </div>
                <div style={{ width: 36 }} /> {/* spacer to balance back btn */}
            </div>

            {/* Content */}
            <div class="hg-welcome-body">
                {step === 0 && <Overview />}
                {step === 1 && <ApiKeySetup />}
            </div>

            {/* Footer nav */}
            <div class="hg-welcome-footer">
                {step > 0 ? (
                    <button
                        class="hg-welcome-nav-btn hg-welcome-nav-btn--ghost"
                        onClick={() => setStep(step - 1)}
                    >
                        Back
                    </button>
                ) : (
                    <div />
                )}
                {step < TOTAL_STEPS - 1 ? (
                    <button
                        class="hg-welcome-nav-btn hg-welcome-nav-btn--primary"
                        onClick={() => setStep(step + 1)}
                    >
                        Next
                        <ChevronRightIcon width="14" height="14" />
                    </button>
                ) : (
                    <button
                        class="hg-welcome-nav-btn hg-welcome-nav-btn--primary"
                        onClick={saveAndClose}
                    >
                        Done
                        <CheckIcon width="14" height="14" />
                    </button>
                )}
            </div>
        </div>
    );
}
