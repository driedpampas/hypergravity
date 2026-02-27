export type StyleHostMode = 'global' | 'shadow';

export type StyleHost = {
    root: HTMLElement;
    mode: StyleHostMode;
    shadowRoot: ShadowRoot | null;
};

export function createStyleHost(container: HTMLElement, mode: StyleHostMode = 'global'): StyleHost {
    if (mode === 'shadow') {
        const shadowRoot = container.shadowRoot ?? container.attachShadow({ mode: 'open' });
        const root = document.createElement('div');
        root.className = 'hg-style-host-root';

        shadowRoot.innerHTML = '';
        shadowRoot.appendChild(root);

        return {
            root,
            mode,
            shadowRoot,
        };
    }

    return {
        root: container,
        mode,
        shadowRoot: null,
    };
}
