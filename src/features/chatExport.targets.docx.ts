import type { ExportBlock, ExportDocument, ExportListBlock } from '@features/chatExport.types';
import type { Document, HeadingLevel, Paragraph, TextRun } from 'docx';

type DocxApi = {
    Document: typeof Document;
    Paragraph: typeof Paragraph;
    TextRun: typeof TextRun;
    HeadingLevel: typeof HeadingLevel;
};

function paragraphRuns(
    TextRunCtor: typeof TextRun,
    block: Extract<ExportBlock, { type: 'paragraph' | 'heading' }>
): TextRun[] {
    return block.inlines
        .map((inline) => {
            if (inline.type === 'code') {
                return new TextRunCtor({ text: inline.code, font: 'Courier New', size: 20 });
            }

            return new TextRunCtor({ text: inline.text, size: 22 });
        })
        .filter(Boolean);
}

function flattenBlockText(blocks: ExportBlock[]): string {
    return blocks
        .map((block) => {
            if (block.type === 'paragraph' || block.type === 'heading') {
                return block.inlines
                    .map((inline) => (inline.type === 'code' ? inline.code : inline.text))
                    .join('')
                    .trim();
            }

            if (block.type === 'codeBlock') {
                return block.code.trim();
            }

            if (block.type === 'list') {
                return block.items.map((item) => flattenBlockText(item)).join(' ');
            }

            if (block.type === 'quote') {
                return flattenBlockText(block.blocks);
            }

            if (block.type === 'hr') {
                return '---';
            }

            return '';
        })
        .filter(Boolean)
        .join(' ')
        .trim();
}

function renderList(
    api: DocxApi,
    list: ExportListBlock,
    paragraphs: InstanceType<typeof Paragraph>[],
    depth = 0
): void {
    list.items.forEach((item, index) => {
        const marker = list.ordered ? `${index + 1}.` : '•';
        const firstLine = flattenBlockText(item);

        paragraphs.push(
            new api.Paragraph({
                children: [new api.TextRun({ text: `${marker} ${firstLine}`, size: 22 })],
                indent: {
                    left: Math.min(720 * (depth + 1), 3600),
                },
                spacing: {
                    after: 120,
                },
            })
        );

        item.forEach((childBlock) => {
            if (childBlock.type === 'list') {
                renderList(api, childBlock, paragraphs, depth + 1);
            }
        });
    });
}

function renderBlocksToParagraphs(
    api: DocxApi,
    blocks: ExportBlock[],
    paragraphs: InstanceType<typeof Paragraph>[]
): void {
    blocks.forEach((block) => {
        if (block.type === 'paragraph') {
            paragraphs.push(
                new api.Paragraph({
                    children: paragraphRuns(api.TextRun, block),
                    spacing: { after: 140 },
                })
            );
            return;
        }

        if (block.type === 'heading') {
            const levelByHeading = [
                api.HeadingLevel.HEADING_1,
                api.HeadingLevel.HEADING_2,
                api.HeadingLevel.HEADING_3,
                api.HeadingLevel.HEADING_4,
                api.HeadingLevel.HEADING_5,
                api.HeadingLevel.HEADING_6,
            ];
            const headingLevel =
                levelByHeading[Math.min(Math.max(block.level, 1), 6) - 1] ||
                api.HeadingLevel.HEADING_3;

            paragraphs.push(
                new api.Paragraph({
                    heading: headingLevel,
                    children: paragraphRuns(api.TextRun, block),
                    spacing: { after: 180 },
                })
            );
            return;
        }

        if (block.type === 'list') {
            renderList(api, block, paragraphs);
            return;
        }

        if (block.type === 'codeBlock') {
            if (block.language) {
                paragraphs.push(
                    new api.Paragraph({
                        children: [
                            new api.TextRun({ text: `[${block.language}]`, size: 18, bold: true }),
                        ],
                        spacing: { after: 80 },
                    })
                );
            }

            block.code.split('\n').forEach((line) => {
                paragraphs.push(
                    new api.Paragraph({
                        children: [new api.TextRun({ text: line, font: 'Courier New', size: 20 })],
                        indent: {
                            left: 320,
                        },
                        spacing: { after: 40 },
                    })
                );
            });
            return;
        }

        if (block.type === 'quote') {
            const quoteText = flattenBlockText(block.blocks);
            paragraphs.push(
                new api.Paragraph({
                    children: [new api.TextRun({ text: quoteText, italics: true, size: 22 })],
                    indent: {
                        left: 500,
                    },
                    spacing: {
                        after: 140,
                    },
                })
            );
            return;
        }

        if (block.type === 'hr') {
            paragraphs.push(
                new api.Paragraph({ text: '----------------------------------------' })
            );
        }
    });
}

export function createDocxDocument(
    api: DocxApi,
    exportDocument: ExportDocument
): InstanceType<typeof Document> {
    const paragraphs: InstanceType<typeof Paragraph>[] = [
        new api.Paragraph({
            heading: api.HeadingLevel.TITLE,
            children: [new api.TextRun({ text: exportDocument.title, bold: true, size: 36 })],
            spacing: { after: 120 },
        }),
        new api.Paragraph({
            children: [
                new api.TextRun({
                    text: `Exported using hypergravity on: ${exportDocument.exportedAt.toLocaleString()}`,
                    size: 20,
                }),
            ],
            spacing: { after: 220 },
        }),
    ];

    exportDocument.messages.forEach((message, index) => {
        if (index > 0) {
            paragraphs.push(
                new api.Paragraph({ text: '----------------------------------------' })
            );
        }

        paragraphs.push(
            new api.Paragraph({
                heading: api.HeadingLevel.HEADING_2,
                children: [new api.TextRun({ text: message.role, bold: true, size: 28 })],
                spacing: { before: 160, after: 120 },
            })
        );

        renderBlocksToParagraphs(api, message.blocks, paragraphs);
    });

    return new api.Document({
        sections: [{ children: paragraphs }],
    });
}
