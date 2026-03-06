import type {
    ChatRole,
    ExportBlock,
    ExportCodeBlock,
    ExportDocument,
    ExportInline,
    ExportListBlock,
    ExportMessage,
} from '@features/chatExport.types';

const USER_SELECTORS = [
    'user-query',
    '.user-message',
    '[data-message-author="user"]',
    '.query-content',
];

const ALL_SELECTORS = [
    ...USER_SELECTORS,
    'model-response',
    '.model-response',
    '[data-message-author="model"]',
    'message-content .markdown-main-panel',
    'generative-ui-response',
    'response-container',
].join(', ');

const UI_ARTIFACT_SELECTORS = [
    'model-thoughts',
    '.thoughts-container',
    '.thoughts-wrapper',
    '.thoughts-header',
    '[data-test-id="model-thoughts"]',
    '.cdk-visually-hidden',
    'source-footnote',
    'sources-carousel-inline',
    'source-inline-chip',
    'sources-list',
    'overview-carousel',
    'sources-sidebar-button',
    '.buttons .copy-button',
].join(', ');

const CONTAINER_TAGS = new Set([
    'DIV',
    'SECTION',
    'ARTICLE',
    'SPAN',
    'MESSAGE-CONTENT',
    'STRUCTURED-CONTENT-CONTAINER',
    'RESPONSE-ELEMENT',
    'CODE-BLOCK',
]);

function normalizeWhitespace(value: string): string {
    return value
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeLineEndings(value: string): string {
    return value.replace(/\r\n?/g, '\n');
}

function hasMeaningfulText(value: string): boolean {
    return normalizeWhitespace(value).length > 0;
}

function preserveInlineText(value: string): string {
    return normalizeLineEndings(value).replace(/\u00a0/g, ' ');
}

function preserveMultilineText(value: string): string {
    const normalized = preserveInlineText(value)
        .split('\n')
        .map((line) => line.replace(/[\t\f\v ]+/g, ' ').trimEnd())
        .join('\n');

    return normalized.replace(/\n{3,}/g, '\n\n').trim();
}

function dedupeTopLevelNodes(nodes: HTMLElement[]): HTMLElement[] {
    return nodes.filter(
        (node, index, arr) =>
            !arr.some((other, otherIndex) => index !== otherIndex && other.contains(node))
    );
}

function isUserNode(node: HTMLElement): boolean {
    return USER_SELECTORS.some((selector) => node.matches(selector) || node.closest(selector));
}

function cleanContentNode(node: HTMLElement): HTMLElement {
    const clone = node.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(UI_ARTIFACT_SELECTORS).forEach((element) => {
        element.remove();
    });
    clone.querySelectorAll('script, style, noscript').forEach((element) => {
        element.remove();
    });
    return clone;
}

function mergeAdjacentTextInlines(inlines: ExportInline[]): ExportInline[] {
    const merged: ExportInline[] = [];
    inlines.forEach((inline) => {
        if (!merged.length) {
            merged.push(inline);
            return;
        }

        const previous = merged[merged.length - 1];
        if (inline.type === 'text' && previous.type === 'text') {
            previous.text += inline.text;
            return;
        }

        merged.push(inline);
    });

    return merged;
}

function parseInlineNodes(element: HTMLElement): ExportInline[] {
    const inlines: ExportInline[] = [];

    Array.from(element.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
            const text = preserveInlineText(child.textContent || '');
            if (hasMeaningfulText(text)) {
                inlines.push({ type: 'text', text });
            }
            return;
        }

        if (!(child instanceof HTMLElement)) {
            return;
        }

        const tag = child.tagName.toUpperCase();
        if (tag === 'BR') {
            inlines.push({ type: 'text', text: '\n' });
            return;
        }

        if (tag === 'CODE' && child.closest('pre') === null) {
            const code = child.textContent || '';
            if (code) {
                inlines.push({ type: 'code', code });
            }
            return;
        }

        inlines.push(...parseInlineNodes(child));
    });

    const merged = mergeAdjacentTextInlines(inlines).map((inline) => {
        if (inline.type === 'text') {
            return {
                type: 'text' as const,
                text: preserveInlineText(inline.text),
            };
        }

        return inline;
    });

    const hasContent = merged.some((inline) =>
        inline.type === 'text' ? hasMeaningfulText(inline.text) : inline.code.length > 0
    );

    return hasContent ? merged : [];
}

function readCodeLanguage(preElement: HTMLElement): string | undefined {
    const codeBlockRoot = preElement.closest('code-block');
    if (!codeBlockRoot) {
        return undefined;
    }

    const label = codeBlockRoot.querySelector('.code-block-decoration span')?.textContent;
    const normalized = normalizeWhitespace(label || '');
    return normalized || undefined;
}

function parseList(listElement: HTMLElement): ExportListBlock | null {
    const ordered = listElement.tagName.toUpperCase() === 'OL';
    const itemElements = Array.from(listElement.children).filter(
        (child) => child instanceof HTMLElement && child.tagName.toUpperCase() === 'LI'
    ) as HTMLElement[];

    const items = itemElements
        .map((item) => {
            const blocks = parseBlocks(item);
            if (blocks.length > 0) {
                return blocks;
            }

            const text = preserveMultilineText(item.innerText || '');
            if (!hasMeaningfulText(text)) {
                return null;
            }

            return [
                {
                    type: 'paragraph' as const,
                    inlines: [{ type: 'text' as const, text }],
                },
            ];
        })
        .filter((item): item is ExportBlock[] => item !== null);

    if (!items.length) {
        return null;
    }

    return {
        type: 'list',
        ordered,
        items,
    };
}

function parseBlocks(element: HTMLElement): ExportBlock[] {
    const blocks: ExportBlock[] = [];

    Array.from(element.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
            const text = preserveMultilineText(child.textContent || '');
            if (hasMeaningfulText(text)) {
                blocks.push({
                    type: 'paragraph',
                    inlines: [{ type: 'text', text }],
                });
            }
            return;
        }

        if (!(child instanceof HTMLElement)) {
            return;
        }

        const tag = child.tagName.toUpperCase();

        if (tag === 'PRE') {
            const codeElement = child.querySelector('code');
            const code = (codeElement?.textContent || child.innerText || '').replace(/\s+$/, '');
            if (!code.trim()) {
                return;
            }

            const block: ExportCodeBlock = {
                type: 'codeBlock',
                code,
                language: readCodeLanguage(child),
            };
            blocks.push(block);
            return;
        }

        if (tag === 'UL' || tag === 'OL') {
            const list = parseList(child);
            if (list) {
                blocks.push(list);
            }
            return;
        }

        if (/^H[1-6]$/.test(tag)) {
            const inlines = parseInlineNodes(child);
            if (!inlines.length) {
                return;
            }

            blocks.push({
                type: 'heading',
                level: Number.parseInt(tag.slice(1), 10),
                inlines,
            });
            return;
        }

        if (tag === 'P') {
            const inlines = parseInlineNodes(child);
            if (!inlines.length) {
                return;
            }

            blocks.push({
                type: 'paragraph',
                inlines,
            });
            return;
        }

        if (tag === 'BLOCKQUOTE') {
            const quoteBlocks = parseBlocks(child);
            if (!quoteBlocks.length) {
                return;
            }

            blocks.push({
                type: 'quote',
                blocks: quoteBlocks,
            });
            return;
        }

        if (tag === 'HR') {
            blocks.push({ type: 'hr' });
            return;
        }

        if (tag === 'CODE') {
            const code = child.textContent || '';
            if (!normalizeWhitespace(code)) {
                return;
            }

            blocks.push({
                type: 'paragraph',
                inlines: [{ type: 'code', code }],
            });
            return;
        }

        if (CONTAINER_TAGS.has(tag)) {
            blocks.push(...parseBlocks(child));
            return;
        }

        const nestedBlocks = parseBlocks(child);
        if (nestedBlocks.length) {
            blocks.push(...nestedBlocks);
            return;
        }

        const inlines = parseInlineNodes(child);
        if (inlines.length) {
            blocks.push({
                type: 'paragraph',
                inlines,
            });
            return;
        }
    });

    return blocks;
}

function normalizeBlocks(blocks: ExportBlock[]): ExportBlock[] {
    const normalized = blocks.filter((block) => {
        if (block.type === 'paragraph' || block.type === 'heading') {
            return block.inlines.some((inline) =>
                inline.type === 'text'
                    ? normalizeWhitespace(inline.text).length > 0
                    : inline.code.length > 0
            );
        }

        if (block.type === 'list') {
            return block.items.length > 0;
        }

        if (block.type === 'codeBlock') {
            return hasMeaningfulText(block.code);
        }

        if (block.type === 'quote') {
            return block.blocks.length > 0;
        }

        return true;
    });

    if (!normalized.length) {
        return [];
    }

    return normalized;
}

function parseMessage(node: HTMLElement): ExportMessage | null {
    const role: ChatRole = isUserNode(node) ? 'User' : 'Gemini';
    const cleanNode = cleanContentNode(node);
    const blocks = normalizeBlocks(parseBlocks(cleanNode));

    if (!blocks.length) {
        const fallback = preserveMultilineText(cleanNode.innerText || '');
        if (!hasMeaningfulText(fallback)) {
            return null;
        }

        return {
            role,
            blocks: [
                {
                    type: 'paragraph',
                    inlines: [{ type: 'text', text: fallback }],
                },
            ],
        };
    }

    return {
        role,
        blocks,
    };
}

export function parseExportDocument({
    title,
    exportedAt,
}: {
    title: string;
    exportedAt: Date;
}): ExportDocument {
    const nodes = dedupeTopLevelNodes(
        Array.from(document.querySelectorAll<HTMLElement>(ALL_SELECTORS))
    );

    const messages = nodes
        .map((node) => parseMessage(node))
        .filter((message): message is ExportMessage => message !== null);

    return {
        title,
        exportedAt,
        messages,
    };
}
