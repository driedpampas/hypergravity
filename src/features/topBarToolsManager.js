class WideLayoutEngine {
    constructor() {
        this.enabled = false;
        this.markedTargets = new Set();
        this.styleId = 'hg-wide-dynamic-style';
        this.ensureDynamicStyle();
    }

    ensureDynamicStyle() {
        if (document.getElementById(this.styleId)) return;

        const style = document.createElement('style');
        style.id = this.styleId;
        style.textContent = `
            body.hg-wide-chat [data-hg-wide-target="1"] {
                max-width: 100% !important;
                width: 100% !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
            }
        `;
        document.head.appendChild(style);
    }

    clearMarkedTargets() {
        this.markedTargets.forEach((element) => {
            if (!element?.isConnected) return;
            element.removeAttribute('data-hg-wide-target');
        });
        this.markedTargets.clear();
    }

    getChatRoots() {
        return [
            document.querySelector('infinite-scroller.chat-history'),
            document.querySelector('.chat-history'),
        ].filter((node) => node instanceof HTMLElement);
    }

    getMessageSelectors() {
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

    collectKnownTargets() {
        const roots = this.getChatRoots();
        const messageSelectors = this.getMessageSelectors().join(', ');
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

    collectInputTargets() {
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

    collectNarrowAncestorsFromMessages() {
        const roots = this.getChatRoots();
        if (!roots.length) return [];

        const messageSelectors = this.getMessageSelectors().join(', ');
        const messages = Array.from(
            roots.flatMap((root) => Array.from(root.querySelectorAll(messageSelectors)))
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

    collectInlineMaxWidthTargets() {
        const roots = this.getChatRoots();

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

    markTarget(element) {
        if (!(element instanceof HTMLElement)) return;

        element.setAttribute('data-hg-wide-target', '1');

        this.markedTargets.add(element);
        console.log('[WideLayoutEngine] Marked element for wide layout:', element);
    }

    refreshTargets() {
        this.clearMarkedTargets();

        const knownTargets = this.collectKnownTargets();
        const inputTargets = this.collectInputTargets();
        const detectedTargets = this.collectNarrowAncestorsFromMessages();
        const inlineMaxWidthTargets = this.collectInlineMaxWidthTargets();

        [...knownTargets, ...inputTargets, ...detectedTargets, ...inlineMaxWidthTargets].forEach((target) => {
            this.markTarget(target);
        });
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled);

        if (!this.enabled) {
            document.body.classList.remove('hg-wide-chat');
            this.clearMarkedTargets();
            return;
        }

        document.body.classList.add('hg-wide-chat');
        this.refreshTargets();
    }

    refresh() {
        if (!this.enabled) return;
        this.refreshTargets();
    }
}

export class TopBarToolsManager {
    constructor({ getSettings, updateSettings, onExportClick, onWideToggleDebug }) {
        this.getSettings = getSettings;
        this.updateSettings = updateSettings;
        this.onExportClick = onExportClick;
        this.onWideToggleDebug = onWideToggleDebug;
        this.wideLayoutEngine = new WideLayoutEngine();
    }

    ensureButton({ id, title, svg, onClick }) {
        const topBar = document.querySelector('top-bar-actions');
        if (!topBar) return null;

        let button = document.getElementById(id);
        if (!button) {
            button = document.createElement('button');
            button.id = id;
            button.className = 'hg-header-btn';
            topBar.appendChild(button);
        }

        if (button.parentElement !== topBar) {
            topBar.appendChild(button);
        }

        button.title = title;
        button.innerHTML = svg;
        button.onclick = onClick;

        return button;
    }

    async handleWideToggle() {
        const settings = await this.getSettings();
        const nextWideModeEnabled = !settings.wideModeEnabled;

        await this.updateSettings({
            wideModeEnabled: nextWideModeEnabled,
        });

        if (typeof this.onWideToggleDebug === 'function') {
            this.onWideToggleDebug(nextWideModeEnabled);
        }

        await this.refresh();
    }

    async refresh() {
        const settings = await this.getSettings();
        const shouldApplyWide =
            Boolean(settings.wideModeEnabled) &&
            !window.location.pathname.includes('/gems/');

        this.wideLayoutEngine.setEnabled(shouldApplyWide);

        const topBar = document.querySelector('top-bar-actions');
        if (!topBar) {
            this.wideLayoutEngine.refresh();
            return;
        }

        const wideButton = this.ensureButton({
            id: 'hg-header-wide-btn',
            title: 'Toggle Wide Chat',
            svg: `
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path class="hg-arrow-left" d="M9 5l-7 7 7 7V5z"/>
                    <path class="hg-arrow-right" d="M15 5v14l7-7-7-7z"/>
                </svg>
            `,
            onClick: () => this.handleWideToggle(),
        });

        wideButton?.classList.toggle('hg-wide-active', shouldApplyWide);

        const shouldShowExport = settings.showExportButton !== false;
        const existingExport = document.getElementById('hg-header-export-btn');

        if (!shouldShowExport) {
            existingExport?.remove();
        } else {
            this.ensureButton({
                id: 'hg-header-export-btn',
                title: 'Export Chat',
                svg: `
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                    </svg>
                `,
                onClick: () => this.onExportClick(),
            });
        }

        this.wideLayoutEngine.refresh();
    }

    destroy() {
        this.wideLayoutEngine.setEnabled(false);
    }
}
