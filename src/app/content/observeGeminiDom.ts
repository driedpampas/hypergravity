export type GeminiDomObserverHandle = {
    disconnect: () => void;
};

export function observeGeminiDom(onMutations: () => void): GeminiDomObserverHandle {
    const observer = new MutationObserver(() => {
        onMutations();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    return {
        disconnect: () => observer.disconnect(),
    };
}
