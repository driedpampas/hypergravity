import { getStorageValue, setStorageValue } from '@utils/browserEnv';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '@utils/constants';

type Settings = typeof DEFAULT_SETTINGS;

/**
 * Applies CSS classes to the document body based on chatbox style settings.
 * @param {Object} settings - The user settings.
 * @param {boolean} [settings.chatboxStyleEnabled] - Whether custom chatbox styling is enabled.
 * @param {boolean} [settings.chatboxCompactEnabled] - Whether compact chatbox styling is enabled.
 */
export function applyChatboxHeaderStyleSetting(settings: Settings): void {
    document.body.classList.toggle(
        'hg-chatbox-header-style-enabled',
        Boolean(settings?.chatboxStyleEnabled)
    );
    document.body.classList.toggle(
        'hg-chatbox-compact-enabled',
        Boolean(settings?.chatboxCompactEnabled)
    );
}

/**
 * Retrieves the current settings from storage, merging with default values.
 * @returns {Promise<Object>} The combined settings object.
 */
export async function getSettings(): Promise<Settings> {
    const settings = await getStorageValue(SETTINGS_KEY, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...((settings || {}) as Partial<Settings>) };
}

/**
 * Updates settings by patching current values and persisting back to storage.
 * @param {Object} patch - The settings properties to update.
 * @returns {Promise<Object>} The updated settings object.
 */
export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const current = await getSettings();
    const next = { ...current, ...patch };
    await setStorageValue(SETTINGS_KEY, next);
    return next;
}
