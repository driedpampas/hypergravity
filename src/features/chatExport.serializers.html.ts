import type {
    ExportBlock,
    ExportDocument,
    ExportInline,
    ExportListBlock,
} from '@features/chatExport.types';

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderInlines(inlines: ExportInline[]): string {
    return inlines
        .map((inline) => {
            if (inline.type === 'code') {
                return `<code>${escapeHtml(inline.code)}</code>`;
            }

            return escapeHtml(inline.text).replace(/\n/g, '<br />');
        })
        .join('');
}

function renderList(list: ExportListBlock): string {
    const tag = list.ordered ? 'ol' : 'ul';
    const items = list.items.map((itemBlocks) => `<li>${renderBlocks(itemBlocks)}</li>`).join('');
    return `<${tag}>${items}</${tag}>`;
}

function renderBlocks(blocks: ExportBlock[]): string {
    return blocks
        .map((block) => {
            if (block.type === 'paragraph') {
                return `<p>${renderInlines(block.inlines)}</p>`;
            }

            if (block.type === 'heading') {
                const level = Math.min(Math.max(block.level, 1), 6);
                return `<h${level}>${renderInlines(block.inlines)}</h${level}>`;
            }

            if (block.type === 'list') {
                return renderList(block);
            }

            if (block.type === 'codeBlock') {
                const languageLabel = block.language
                    ? `<div class="hg-export-code-language">${escapeHtml(block.language)}</div>`
                    : '';
                return `<div class="hg-export-code-block">${languageLabel}<pre><code>${escapeHtml(
                    block.code
                )}</code></pre></div>`;
            }

            if (block.type === 'quote') {
                return `<blockquote>${renderBlocks(block.blocks)}</blockquote>`;
            }

            if (block.type === 'hr') {
                return '<hr />';
            }

            return '';
        })
        .join('');
}

export function serializeDocumentAsStyledHtml(document: ExportDocument): string {
    const messageHtml = document.messages
        .map((message) => {
            const roleClass =
                message.role === 'User' ? 'hg-export-role-user' : 'hg-export-role-gemini';
            return `<section class="hg-export-message ${roleClass}">
                <header class="hg-export-role">${escapeHtml(message.role)}</header>
                <div class="hg-export-content">${renderBlocks(message.blocks)}</div>
            </section>`;
        })
        .join('');

    return `<!doctype html>
<html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(document.title)}</title>
        <style>
            :root {
                color-scheme: light;
            }

            * {
                box-sizing: border-box;
            }

            body {
                margin: 0;
                background: #f6f8fb;
                color: #1f2937;
                font-family: 'Google Sans Flex', 'Google Sans', 'Inter', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
            }

            .hg-export-shell {
                max-width: 920px;
                margin: 0 auto;
                padding: 28px 20px 40px;
            }

            .hg-export-head {
                background: #ffffff;
                border: 1px solid #d9e0ec;
                border-radius: 14px;
                padding: 20px;
                margin-bottom: 16px;
            }

            .hg-export-head h1 {
                margin: 0;
                font-size: 26px;
                line-height: 1.25;
            }

            .hg-export-meta {
                margin-top: 8px;
                font-size: 13px;
                color: #5a6472;
            }

            .hg-export-message {
                background: #ffffff;
                border: 1px solid #d9e0ec;
                border-radius: 14px;
                padding: 16px;
                margin-bottom: 12px;
            }

            .hg-export-role {
                display: inline-flex;
                align-items: center;
                border-radius: 999px;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.02em;
                padding: 4px 10px;
                margin-bottom: 12px;
            }

            .hg-export-role-user .hg-export-role {
                color: #1d4ed8;
                background: #dbeafe;
            }

            .hg-export-role-gemini .hg-export-role {
                color: #7c2d12;
                background: #ffedd5;
            }

            .hg-export-content :is(p, ul, ol, pre, blockquote, hr, h1, h2, h3, h4, h5, h6) {
                margin-top: 0;
                margin-bottom: 0.85em;
            }

            .hg-export-content ul,
            .hg-export-content ol {
                padding-left: 1.35em;
            }

            .hg-export-content code {
                font-family: ui-monospace, 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
                background: #f1f5f9;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 0.1em 0.35em;
                font-size: 0.92em;
            }

            .hg-export-code-block {
                border: 1px solid #d7deea;
                border-radius: 10px;
                overflow: hidden;
                background: #0f172a;
            }

            .hg-export-code-language {
                color: #cbd5e1;
                background: #1e293b;
                font-size: 12px;
                font-weight: 600;
                padding: 6px 10px;
                border-bottom: 1px solid #334155;
                text-transform: uppercase;
                letter-spacing: 0.03em;
            }

            .hg-export-code-block pre {
                margin: 0;
                padding: 12px;
                overflow-x: auto;
            }

            .hg-export-code-block pre code {
                background: transparent;
                border: none;
                color: #e2e8f0;
                padding: 0;
            }

            .hg-export-content blockquote {
                border-left: 4px solid #d6dde8;
                padding-left: 12px;
                margin-left: 0;
                color: #334155;
            }

            @media print {
                body {
                    background: #fff;
                }

                .hg-export-shell {
                    max-width: none;
                    padding: 0;
                }

                .hg-export-head,
                .hg-export-message {
                    break-inside: avoid;
                    border-color: #d7deea;
                    box-shadow: none;
                }
            }
        </style>
    </head>
    <body>
        <main class="hg-export-shell">
            <header class="hg-export-head">
                <h1>${escapeHtml(document.title)}</h1>
                <p class="hg-export-meta">Exported using hypergravity on: ${escapeHtml(
                    document.exportedAt.toLocaleString()
                )}</p>
            </header>
            ${messageHtml}
        </main>
    </body>
</html>`;
}
