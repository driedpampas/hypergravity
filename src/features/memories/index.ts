import '@features/memories/memories.css';
import { MENU_CONTENT_SELECTOR } from '@features/memories/constants';
import { injectMemoriesMenu } from '@features/memories/menuIntegration';
import { createMemoriesPickerController } from '@features/memories/picker';

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
