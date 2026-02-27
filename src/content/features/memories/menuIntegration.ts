import { SmallMemoriesIcon as MemoriesIcon } from '@icons/MemoriesIcon';
import { h, render } from 'preact';

function createMemoriesMenuItem(onSelect: () => void) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className =
        'mat-mdc-menu-item mat-focus-indicator at-mentions-menu_item ng-star-inserted hg-at-memory-button';
    button.setAttribute('role', 'menuitem');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-disabled', 'false');
    button.setAttribute('aria-label', 'Memories');
    button.setAttribute('data-hg-at-memory-item', 'true');

    const textWrap = document.createElement('span');
    textWrap.className = 'mat-mdc-menu-item-text';

    const contentWrap = document.createElement('span');
    contentWrap.className = 'menu-item-content ng-star-inserted';

    const attribution = document.createElement('div');
    attribution.className = 'tool-attribution';

    render(h(MemoriesIcon, { className: 'extension-icon ng-star-inserted' }), attribution);

    const label = document.createElement('span');
    label.className = 'tool-attribution-label gds-label-l';
    label.textContent = 'Memories';

    attribution.appendChild(label);
    contentWrap.appendChild(attribution);
    textWrap.appendChild(contentWrap);

    const ripple = document.createElement('div');
    ripple.setAttribute('matripple', '');
    ripple.className = 'mat-ripple mat-mdc-menu-ripple';

    button.append(textWrap, ripple);
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect();
    });

    return button;
}

function createMemoriesMenuLabel() {
    const label = document.createElement('div');
    label.className = 'menu-item-label gds-label-l ng-star-inserted';
    label.textContent = 'hypergravity';
    label.setAttribute('data-hg-at-memory-label', 'true');
    return label;
}

export function injectMemoriesMenu(menuContent: Element, onSelect: () => void) {
    const existingButton = menuContent.querySelector('[data-hg-at-memory-item="true"]');
    if (existingButton) return;

    const label = createMemoriesMenuLabel();
    const button = createMemoriesMenuItem(onSelect);

    menuContent.appendChild(label);
    menuContent.appendChild(button);
}
