import { topBarManager } from '../managers/topBarManager';

function createWideLayoutEngine() {
    let enabled = false;
    const markedTargets = new Set();
    const styleId = 'hg-wide-dynamic-style';

    function ensureDynamicStyle() {
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            body.hg-wide-chat [data-hg-wide-target="1"] {
                max-width: 100% !important;
                width: 100% !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                box-sizing: border-box !important;
            }
        `;
        document.head.appendChild(style);
    }

    function clearMarkedTargets() {
        markedTargets.forEach((element) => {
            if (!element?.isConnected) return;
            element.removeAttribute('data-hg-wide-target');
        });
        markedTargets.clear();
    }

    function getChatRoots() {
        return [
            document.querySelector('infinite-scroller.chat-history'),
            document.querySelector('.chat-history'),
        ].filter((node) => node instanceof HTMLElement);
    }

    function getMessageSelectors() {
        return [
            '.conversation-container',
            '.user-message',
            '[data-message-author="user"]',
            '.query-content',
            'user-query',
            '.model-response',
            '[data-message-author="model"]',
            'model-response',
            '.response-container',
            'response-container',
            'message-content',
            '.markdown-main-panel',
        ];
    }

    function collectKnownTargets() {
        const roots = getChatRoots();
        const messageSelectors = getMessageSelectors().join(', ');
        const candidates = new Set();

        roots.forEach((root) => {
            candidates.add(root);
            root.querySelectorAll(messageSelectors).forEach((node) => {
                if (node instanceof HTMLElement) {
                    candidates.add(node);
                }
            });
        });

        return Array.from(candidates);
    }

    function collectInputTargets() {
        return Array.from(
            document.querySelectorAll(
                [
                    'input-container',
                    'input-container .input-area-container',
                    'input-container.input-gradient',
                    '.input-area-container',
                    '.text-input-field',
                ].join(', ')
            )
        ).filter((node) => node instanceof HTMLElement);
    }

    function collectNarrowAncestorsFromMessages() {
        const roots = getChatRoots();
        if (!roots.length) return [];

        const messageSelectors = getMessageSelectors().join(', ');
        const messages = Array.from(
            roots.flatMap((root) =>
                Array.from(root.querySelectorAll(messageSelectors))
            )
        ).filter((node) => node instanceof HTMLElement);

        const candidates = new Set();

        messages.forEach((messageNode) => {
            let current = messageNode;
            let depth = 0;

            while (
                current &&
                current instanceof HTMLElement &&
                current !== document.body &&
                depth < 18
            ) {
                const rect = current.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;
                const isNarrow =
                    rect.width > 320 &&
                    rect.width < window.innerWidth - 32 &&
                    window.getComputedStyle(current).display !== 'inline';

                if (isVisible && isNarrow) {
                    candidates.add(current);
                }

                if (roots.some((root) => current === root)) {
                    break;
                }

                current = current.parentElement;
                depth += 1;
            }
        });

        return Array.from(candidates);
    }

    function collectInlineMaxWidthTargets() {
        const roots = getChatRoots();

        if (!roots.length) return [];

        const candidates = new Set();

        roots.forEach((root) => {
            root.querySelectorAll('[style*="max-width"]').forEach((node) => {
                if (!(node instanceof HTMLElement)) return;

                const rect = node.getBoundingClientRect();
                if (rect.width <= 320 || rect.height <= 0) return;

                const maxWidth = window.getComputedStyle(node).maxWidth;
                if (!maxWidth || maxWidth === 'none' || maxWidth === '100%') {
                    return;
                }

                candidates.add(node);
            });
        });

        return Array.from(candidates);
    }

    function markTarget(element) {
        if (!(element instanceof HTMLElement)) return;

        element.setAttribute('data-hg-wide-target', '1');

        markedTargets.add(element);
    }

    function refreshTargets() {
        clearMarkedTargets();

        const knownTargets = collectKnownTargets();
        const inputTargets = collectInputTargets();
        const detectedTargets = collectNarrowAncestorsFromMessages();
        const inlineMaxWidthTargets = collectInlineMaxWidthTargets();

        [
            ...knownTargets,
            ...inputTargets,
            ...detectedTargets,
            ...inlineMaxWidthTargets,
        ].forEach((target) => {
            markTarget(target);
        });
    }

    function setEnabled(nextEnabled) {
        enabled = Boolean(nextEnabled);

        if (!enabled) {
            document.body.classList.remove('hg-wide-chat');
            clearMarkedTargets();
            return;
        }

        document.body.classList.add('hg-wide-chat');
        refreshTargets();
    }

    function refresh() {
        if (!enabled) return;
        refreshTargets();
    }

    ensureDynamicStyle();

    return {
        setEnabled,
        refresh,
    };
}

export function createTopBarToolsManager({
    getSettings,
    updateSettings,
    onExportClick,
    onWideToggleDebug,
}) {
    const wideLayoutEngine = createWideLayoutEngine();

    async function handleWideToggle() {
        const settings = await getSettings();
        const nextWideModeEnabled = !settings.wideModeEnabled;

        await updateSettings({
            wideModeEnabled: nextWideModeEnabled,
        });

        if (typeof onWideToggleDebug === 'function') {
            onWideToggleDebug(nextWideModeEnabled);
        }

        await refresh();
    }

    async function refresh() {
        const settings = await getSettings();
        const shouldApplyWide =
            Boolean(settings.wideModeEnabled) &&
            !window.location.pathname.includes('/gems/');

        wideLayoutEngine.setEnabled(shouldApplyWide);

        if (!topBarManager.getTopBar()) {
            wideLayoutEngine.refresh();
            return;
        }

        const wideButton = topBarManager.ensureButton({
            id: 'hg-header-wide-btn',
            title: 'Toggle Wide Chat',
            svg: `
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path class="hg-arrow-left" d="M9 5l-7 7 7 7V5z"/>
                    <path class="hg-arrow-right" d="M15 5v14l7-7-7-7z"/>
                </svg>
            `,
            onClick: () => handleWideToggle(),
        });

        wideButton?.classList.toggle('hg-wide-active', shouldApplyWide);

        const shouldShowExport = settings.showExportButton !== false;
        const existingExport = document.getElementById('hg-header-export-btn');

        if (!shouldShowExport) {
            existingExport?.remove();
        } else {
            topBarManager.ensureButton({
                id: 'hg-header-export-btn',
                title: 'Export Chat',
                svg: `
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                    </svg>
                `,
                onClick: () => onExportClick(),
            });
        }

        wideLayoutEngine.refresh();
    }

    function destroy() {
        wideLayoutEngine.setEnabled(false);
    }

    return {
        refresh,
        destroy,
    };
}
