import type {
    ExportBlock,
    ExportDocument,
    ExportInline,
    ExportListBlock,
} from '@features/chatExport.types';

function renderInlineText(inlines: ExportInline[]): string {
    return inlines
        .map((inline) => {
            if (inline.type === 'code') {
                return inline.code;
            }

            return inline.text;
        })
        .join('')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd();
}

function blocksToText(blocks: ExportBlock[], depth = 0): string {
    const lines: string[] = [];

    blocks.forEach((block) => {
        if (block.type === 'paragraph') {
            const value = renderInlineText(block.inlines);
            if (value) {
                lines.push(value);
            }
            return;
        }

        if (block.type === 'heading') {
            const value = renderInlineText(block.inlines);
            if (value) {
                lines.push(value.toUpperCase());
            }
            return;
        }

        if (block.type === 'codeBlock') {
            if (block.language) {
                lines.push(`[${block.language}]`);
            }
            lines.push(block.code.trimEnd());
            return;
        }

        if (block.type === 'list') {
            lines.push(listToText(block, depth));
            return;
        }

        if (block.type === 'quote') {
            lines.push(blocksToText(block.blocks, depth));
            return;
        }

        if (block.type === 'hr') {
            lines.push('----------------------------------------');
        }
    });

    return lines.filter((line) => line.trim().length > 0).join('\n\n');
}

function listToText(list: ExportListBlock, depth = 0): string {
    const indent = '    '.repeat(depth);
    return list.items
        .map((item, index) => {
            const marker = list.ordered ? `${index + 1}.` : '•';
            const itemText = blocksToText(item, depth + 1).split('\n');
            return itemText
                .map((line, lineIndex) =>
                    lineIndex === 0 ? `${indent}${marker} ${line}` : `${indent}   ${line}`
                )
                .join('\n');
        })
        .join('\n');
}

function escapeMarkdownText(value: string): string {
    return value.replace(/([\\*_{}()[\]#+!|>])/g, '\\$1');
}

function wrapInlineCode(value: string): string {
    const maxRun = Math.max(...(value.match(/`+/g)?.map((run) => run.length) || [0]));
    const fence = '`'.repeat(maxRun + 1);
    return `${fence}${value}${fence}`;
}

function renderInlineMarkdown(inlines: ExportInline[]): string {
    return inlines
        .map((inline) => {
            if (inline.type === 'code') {
                return wrapInlineCode(inline.code);
            }

            return escapeMarkdownText(inline.text);
        })
        .join('')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd();
}

function listToMarkdown(list: ExportListBlock, depth = 0): string {
    const indent = '    '.repeat(depth);
    return list.items
        .map((item, index) => {
            const marker = list.ordered ? `${index + 1}.` : '-';
            const itemMarkdown = blocksToMarkdown(item, depth + 1).trim();
            const lines = itemMarkdown.split('\n');

            return lines
                .map((line, lineIndex) =>
                    lineIndex === 0 ? `${indent}${marker} ${line}` : `${indent}    ${line}`
                )
                .join('\n');
        })
        .join('\n');
}

function blocksToMarkdown(blocks: ExportBlock[], depth = 0): string {
    const sections: string[] = [];

    blocks.forEach((block) => {
        if (block.type === 'paragraph') {
            const value = renderInlineMarkdown(block.inlines);
            if (value) {
                sections.push(value);
            }
            return;
        }

        if (block.type === 'heading') {
            const value = renderInlineMarkdown(block.inlines);
            if (value) {
                const level = Math.min(Math.max(block.level, 1), 6);
                sections.push(`${'#'.repeat(level)} ${value}`);
            }
            return;
        }

        if (block.type === 'codeBlock') {
            const maxRun = Math.max(...(block.code.match(/`+/g)?.map((run) => run.length) || [0]));
            const fence = '`'.repeat(Math.max(3, maxRun + 1));
            sections.push(
                `${fence}${block.language?.toLowerCase() || ''}\n${block.code}\n${fence}`
            );
            return;
        }

        if (block.type === 'list') {
            sections.push(listToMarkdown(block, depth));
            return;
        }

        if (block.type === 'quote') {
            const quoteContent = blocksToMarkdown(block.blocks, depth)
                .split('\n')
                .map((line) => (line.trim() ? `> ${line}` : '>'))
                .join('\n');
            sections.push(quoteContent);
            return;
        }

        if (block.type === 'hr') {
            sections.push('---');
        }
    });

    return sections.join('\n\n').trim();
}

function blockquoteMarkdown(content: string): string {
    return content
        .split('\n')
        .map((line) => (line.length ? `> ${line}` : '>'))
        .join('\n');
}

export function serializeDocumentAsText(document: ExportDocument): string {
    let output = `${document.title}\nExported using hypergravity on: ${document.exportedAt.toLocaleString()}\n\n`;

    document.messages.forEach((message, index) => {
        if (index > 0) {
            output += '\n----------------------------------------\n\n';
        }

        output += `${message.role}\n\n`;
        output += `${blocksToText(message.blocks)}\n\n`;
    });

    return output.trimEnd();
}

export function serializeDocumentAsMarkdown(document: ExportDocument): string {
    const sections: string[] = [
        `# ${escapeMarkdownText(document.title)}`,
        `Exported using hypergravity on: ${escapeMarkdownText(document.exportedAt.toLocaleString())}`,
    ];

    document.messages.forEach((message) => {
        const messageBody = blocksToMarkdown(message.blocks);
        sections.push('---');
        sections.push(`**${message.role}**`);

        if (message.role === 'Gemini') {
            sections.push(blockquoteMarkdown(messageBody || ''));
        } else {
            sections.push(messageBody || '');
        }
    });

    return sections.filter(Boolean).join('\n\n').trim();
}
