import '@content/features/memories/memories.css';
import { MENU_CONTENT_SELECTOR } from '@content/features/memories/constants';
import { injectMemoriesMenu } from '@content/features/memories/menuIntegration';
import { createMemoriesPickerController } from '@content/features/memories/picker';

export function createAtMentionsMemoriesManager() {
    const pickerController = createMemoriesPickerController();

    function refresh() {
        const menuContents = document.querySelectorAll(MENU_CONTENT_SELECTOR);
        for (const menuContent of menuContents) {
            injectMemoriesMenu(menuContent, () => {
                void pickerController.openPicker();
            });
        }
    }

    function cleanup() {
        pickerController.closePicker();
    }

    return {
        refresh,
        cleanup,
    };
}
