import type { ExportBlock, ExportDocument, ExportListBlock } from '@features/chatExport.types';
import type { jsPDF } from 'jspdf';

type PdfApi = jsPDF;

type PdfContext = {
    pdf: PdfApi;
    y: number;
    margin: number;
    pageWidth: number;
    pageHeight: number;
    contentWidth: number;
};

function ensureSpace(context: PdfContext, needed = 18): void {
    if (context.y + needed <= context.pageHeight - context.margin) {
        return;
    }

    context.pdf.addPage();
    context.y = context.margin;
}

function writeParagraph(
    context: PdfContext,
    text: string,
    {
        fontSize = 10,
        bold = false,
        font = 'helvetica',
        indent = 0,
    }: { fontSize?: number; bold?: boolean; font?: 'helvetica' | 'courier'; indent?: number } = {}
): void {
    const clean = text.trim();
    if (!clean) {
        return;
    }

    context.pdf.setFont(font, bold ? 'bold' : 'normal');
    context.pdf.setFontSize(fontSize);

    const maxWidth = context.contentWidth - indent;
    const lines = context.pdf.splitTextToSize(clean, maxWidth);
    const lineHeight = Math.max(fontSize + 3, 13);

    lines.forEach((line: string) => {
        ensureSpace(context, lineHeight + 2);
        context.pdf.text(line, context.margin + indent, context.y);
        context.y += lineHeight;
    });

    context.y += 4;
}

function renderList(context: PdfContext, list: ExportListBlock, depth = 0): void {
    const indent = depth * 18;

    list.items.forEach((item, index) => {
        const marker = list.ordered ? `${index + 1}.` : '•';
        writeParagraph(context, marker, { fontSize: 10, bold: true, indent });
        renderBlocks(context, item, depth + 1);
    });
}

function renderBlocks(context: PdfContext, blocks: ExportBlock[], depth = 0): void {
    blocks.forEach((block) => {
        if (block.type === 'paragraph') {
            const text = block.inlines
                .map((inline) => (inline.type === 'code' ? inline.code : inline.text))
                .join('');
            writeParagraph(context, text, { fontSize: 10, indent: depth * 18 });
            return;
        }

        if (block.type === 'heading') {
            const text = block.inlines
                .map((inline) => (inline.type === 'code' ? inline.code : inline.text))
                .join('');
            const size = Math.max(12, 18 - block.level * 2);
            writeParagraph(context, text, { fontSize: size, bold: true, indent: depth * 10 });
            return;
        }

        if (block.type === 'list') {
            renderList(context, block, depth + 1);
            return;
        }

        if (block.type === 'codeBlock') {
            const codeLines = block.code.split('\n');
            if (block.language) {
                writeParagraph(context, `[${block.language}]`, {
                    fontSize: 9,
                    bold: true,
                    font: 'courier',
                    indent: depth * 16,
                });
            }

            codeLines.forEach((line) => {
                writeParagraph(context, line, {
                    fontSize: 9,
                    font: 'courier',
                    indent: depth * 16 + 8,
                });
            });

            context.y += 2;
            return;
        }

        if (block.type === 'quote') {
            renderBlocks(context, block.blocks, depth + 1);
            return;
        }

        if (block.type === 'hr') {
            ensureSpace(context, 18);
            context.pdf.setDrawColor(190, 198, 210);
            context.pdf.line(
                context.margin + depth * 8,
                context.y,
                context.pageWidth - context.margin,
                context.y
            );
            context.y += 12;
        }
    });
}

export function renderDocumentToPdf(pdf: PdfApi, document: ExportDocument): void {
    const margin = 48;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const context: PdfContext = {
        pdf,
        y: margin,
        margin,
        pageWidth,
        pageHeight,
        contentWidth: pageWidth - margin * 2,
    };

    writeParagraph(context, document.title, { fontSize: 16, bold: true });
    writeParagraph(
        context,
        `Exported using hypergravity on: ${document.exportedAt.toLocaleString()}`,
        {
            fontSize: 10,
        }
    );

    document.messages.forEach((message, index) => {
        if (index > 0) {
            ensureSpace(context, 16);
            context.pdf.setDrawColor(210, 216, 226);
            context.pdf.line(
                context.margin,
                context.y,
                context.pageWidth - context.margin,
                context.y
            );
            context.y += 12;
        }

        writeParagraph(context, message.role, { fontSize: 12, bold: true });
        renderBlocks(context, message.blocks);
        context.y += 4;
    });
}
