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
            element.style.removeProperty('max-width');
            element.style.removeProperty('width');
            element.style.removeProperty('margin-left');
            element.style.removeProperty('margin-right');
        });
        this.markedTargets.clear();
    }

    collectKnownTargets() {
        const selectors = [
            '.conversation-container',
            'conversation-container',
            'user-query',
            'model-response',
            '.response-container',
            'response-container',
            'message-content',
            '.markdown-main-panel',
            'input-container',
            '.input-area-container',
            '.text-input-field',
            'infinite-scroller.chat-history',
            '.chat-history',
        ];

        return Array.from(document.querySelectorAll(selectors.join(', '))).filter(
            (node) => node instanceof HTMLElement
        );
    }

    collectNarrowAncestorsFromMessages() {
        const messages = Array.from(
            document.querySelectorAll(
                [
                    'user-query',
                    'model-response',
                    'response-container',
                    '.response-container',
                    'message-content .markdown-main-panel',
                ].join(', ')
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
                depth < 12
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

                current = current.parentElement;
                depth += 1;
            }
        });

        return Array.from(candidates);
    }

    markTarget(element) {
        if (!(element instanceof HTMLElement)) return;

        element.setAttribute('data-hg-wide-target', '1');
        element.style.setProperty('max-width', '100%', 'important');
        element.style.setProperty('width', '100%', 'important');
        element.style.setProperty('margin-left', '0', 'important');
        element.style.setProperty('margin-right', '0', 'important');

        this.markedTargets.add(element);
    }

    refreshTargets() {
        this.clearMarkedTargets();

        const knownTargets = this.collectKnownTargets();
        const detectedTargets = this.collectNarrowAncestorsFromMessages();

        [...knownTargets, ...detectedTargets].forEach((target) => {
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
    constructor({ getSettings, updateSettings, onExportClick }) {
        this.getSettings = getSettings;
        this.updateSettings = updateSettings;
        this.onExportClick = onExportClick;
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
            button.title = title;
            button.innerHTML = svg;
            button.addEventListener('click', onClick);
            topBar.appendChild(button);
        }

        return button;
    }

    async handleWideToggle() {
        const settings = await this.getSettings();
        await this.updateSettings({
            wideModeEnabled: !settings.wideModeEnabled,
        });
        await this.refresh();
    }

    async refresh() {
        const settings = await this.getSettings();
        const topBar = document.querySelector('top-bar-actions');
        if (!topBar) return;

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

        const shouldApplyWide =
            Boolean(settings.wideModeEnabled) &&
            !window.location.pathname.includes('/gems/');

        this.wideLayoutEngine.setEnabled(shouldApplyWide);
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
