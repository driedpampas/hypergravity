import '@features/memories/memories.css';
import { MENU_CONTENT_SELECTOR } from '@features/memories/constants';
import { createMemoryMentionExpansionManager } from '@features/memories/mentionExpansion';
import { injectMemoriesMenu } from '@features/memories/menuIntegration';
import { createMemoriesPickerController } from '@features/memories/picker';

export function createAtMentionsMemoriesManager() {
    const pickerController = createMemoriesPickerController();
    const mentionExpansionManager = createMemoryMentionExpansionManager();

    function refresh() {
        mentionExpansionManager.refresh();
        const menuContents = document.querySelectorAll(MENU_CONTENT_SELECTOR);
        for (const menuContent of menuContents) {
            injectMemoriesMenu(menuContent, () => {
                void pickerController.openPicker();
            });
        }
    }

    function cleanup() {
        pickerController.closePicker();
        mentionExpansionManager.cleanup();
    }

    return {
        refresh,
        cleanup,
    };
}
