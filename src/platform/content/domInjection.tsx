import { createStyleHost } from '@core/styles/styleHost';
import { ChatTools } from '@modules/chat-tools/ChatTools';
import { Sidebar } from '@modules/sidebar';
import { render } from 'preact';

/**
 * Identifies the sidebar injection point and inserts the Hypergravity sidebar root.
 */
export function insertHypergravitySidebar() {
    if (document.querySelector('#hypergravity-root')) return;

    let target: Element | null = document.querySelector('conversations-list');
    let insertMode: 'prepend' | 'afterend' | 'before' = 'prepend';

    if (!target) {
        const gemsList = document.querySelector('.gems-list-container');
        if (gemsList) {
            target = gemsList;
            insertMode = 'afterend';
        } else {
            const sideNav =
                document.querySelector('bard-sidenav infinite-scroller') ||
                document.querySelector('infinite-scroller[scrollable="true"]') ||
                document.querySelector('.conversations-container');
            if (sideNav) {
                target = sideNav;
                insertMode = 'before';
            }
        }
    }

    if (!target || target === document.body) return;

    const rootElement = document.createElement('div');
    rootElement.id = 'hypergravity-root';
    rootElement.style.cssText = 'overflow: visible; transition: margin-top 0.2s ease;';

    if (insertMode === 'afterend') {
        target.insertAdjacentElement('afterend', rootElement);
    } else if (insertMode === 'before') {
        target.insertAdjacentElement('beforebegin', rootElement);
    } else {
        target.prepend(rootElement);
    }

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
