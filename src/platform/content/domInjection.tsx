import { createStyleHost } from '@core/styles/styleHost';
import { ChatTools } from '@modules/chat-tools/ChatTools';
import { Sidebar } from '@modules/sidebar';
import { render } from 'preact';

/**
 * Identifies the sidebar injection point and inserts the Hypergravity sidebar root.
 */
export function insertHypergravitySidebar() {
    if (document.querySelector('#hypergravity-root')) return;

    const overflowContainers = Array.from(document.querySelectorAll('div.overflow-container'));
    const targetContainer =
        overflowContainers.find((container) =>
            container.querySelector('infinite-scroller div.chat-history')
        ) || null;

    if (!targetContainer) return;

    const actionList = targetContainer.querySelector('mat-action-list');
    if (!actionList) return;

    const rootElement = document.createElement('div');
    rootElement.id = 'hypergravity-root';
    rootElement.style.cssText = 'overflow: visible; transition: margin-top 0.2s ease;';

    actionList.append(rootElement);

    const styleHost = createStyleHost(rootElement, 'global');
    rootElement.dataset.hgStyleHost = styleHost.mode;

    render(<Sidebar />, styleHost.root);
}

/**
 * Identifies the message input area and injects the ChatTools component.
 */
export function insertChatTools() {
    const chatContainer: HTMLElement | null =
        document.querySelector('.text-input-field') ||
        document.querySelector('.leading-actions-wrapper');
    if (!chatContainer) return;

    if (window.getComputedStyle(chatContainer).position === 'static') {
        chatContainer.style.position = 'relative';
    }

    let toolsRoot = document.querySelector<HTMLElement>('#hypergravity-chat-tools-root');
    if (!toolsRoot) {
        toolsRoot = document.createElement('div');
        toolsRoot.id = 'hypergravity-chat-tools-root';
        toolsRoot.className = 'hg-chat-tools-container';

        const styleHost = createStyleHost(toolsRoot, 'global');
        toolsRoot.dataset.hgStyleHost = styleHost.mode;
        render(<ChatTools />, styleHost.root);
    }

    const controlsRow = chatContainer.querySelector(
        '.input-buttons-wrapper-bottom, .leading-actions-wrapper'
    );

    const targetParent = controlsRow?.parentElement || chatContainer;
    const beforeNode = controlsRow || null;

    const isAlreadyPlaced =
        toolsRoot.parentElement === targetParent &&
        (beforeNode
            ? toolsRoot.nextElementSibling === beforeNode
            : targetParent.firstElementChild === toolsRoot);

    if (!isAlreadyPlaced) {
        if (beforeNode) {
            targetParent.insertBefore(toolsRoot, beforeNode);
        } else {
            targetParent.prepend(toolsRoot);
        }
    }
}
