import { parseExportDocument } from '@features/chatExport.parser';
import {
    serializeDocumentAsMarkdown,
    serializeDocumentAsText,
} from '@features/chatExport.serializers';
import { serializeDocumentAsStyledHtml } from '@features/chatExport.serializers.html';
import { createDocxDocument } from '@features/chatExport.targets.docx';
import { renderDocumentToPdf } from '@features/chatExport.targets.pdf';
import type { ExportDocument } from '@features/chatExport.types';
import {
    ClipboardExportIcon,
    DocsIcon,
    HtmlIcon,
    MarkdownIcon,
    PictureAsPdfIcon,
    PrintMenuIcon,
    TextSnippetIcon,
} from '@icons';
import { render } from 'preact';

type ActiveChatInfo = {
    id: string;
    title: string;
    url: string;
};

/**
 * Normalizes a string for use as a filename by removing non-alphanumeric characters.
 * @param {string} value - The input string.
 * @returns {string} The sanitized filename.
 */
function sanitizeFilename(value: string): string {
    return (value || 'Gemini_Chat')
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .slice(0, 60);
}

/**
 * Triggers a file download in the browser using a Blob and a temporary anchor element.
 * @param {Blob} blob - The file content blob.
 * @param {string} filename - The name of the file to save as.
 */
function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 200);
}

/**
 * Controller class managing the extraction and export of Gemini chat history in various formats.
 */
export class ChatExportController {
    private showToast: (message: string, type?: 'info' | 'success' | 'error') => void;

    private findActiveChatInfo: () => ActiveChatInfo | null;

    constructor({
        showToast,
        findActiveChatInfo,
    }: {
        showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
        findActiveChatInfo: () => ActiveChatInfo | null;
    }) {
        this.showToast = showToast;
        this.findActiveChatInfo = findActiveChatInfo;
    }

    private buildExportDocument(): ExportDocument {
        const chat = this.findActiveChatInfo();
        const title = chat?.title || 'Gemini Chat';
        const exportedAt = new Date();

        return parseExportDocument({
            title,
            exportedAt,
        });
    }

    /**
     * Main entry point for TXT export.
     */
    exportAsText() {
        const exportDocument = this.buildExportDocument();
        if (!exportDocument.messages.length) {
            this.showToast('Cannot export empty chat', 'error');
            return;
        }

        const text = serializeDocumentAsText(exportDocument);
        const fileBase = sanitizeFilename(exportDocument.title);

        downloadBlob(
            new Blob([text], { type: 'text/plain' }),
            `${fileBase}_${new Date().toISOString().slice(0, 10)}.txt`
        );

        this.showToast('Text downloaded', 'success');
    }

    exportAsMarkdown() {
        const exportDocument = this.buildExportDocument();
        if (!exportDocument.messages.length) {
            this.showToast('Cannot export empty chat', 'error');
            return;
        }

        const markdown = serializeDocumentAsMarkdown(exportDocument);
        const fileBase = sanitizeFilename(exportDocument.title);

        downloadBlob(
            new Blob([markdown], { type: 'text/markdown' }),
            `${fileBase}_${new Date().toISOString().slice(0, 10)}.md`
        );

        this.showToast('Markdown downloaded', 'success');
    }

    exportAsHtml() {
        const exportDocument = this.buildExportDocument();
        if (!exportDocument.messages.length) {
            this.showToast('Cannot export empty chat', 'error');
            return;
        }

        const html = serializeDocumentAsStyledHtml(exportDocument);
        const fileBase = sanitizeFilename(exportDocument.title);

        downloadBlob(
            new Blob([html], { type: 'text/html' }),
            `${fileBase}_${new Date().toISOString().slice(0, 10)}.html`
        );

        this.showToast('HTML downloaded', 'success');
    }

    async exportAsPdf() {
        const exportDocument = this.buildExportDocument();
        if (!exportDocument.messages.length) {
            this.showToast('Cannot export empty chat', 'error');
            return;
        }

        try {
            const { jsPDF } = await import('jspdf');
            const fileBase = sanitizeFilename(exportDocument.title);

            const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
            renderDocumentToPdf(pdf, exportDocument);

            pdf.save(`${fileBase}_${new Date().toISOString().slice(0, 10)}.pdf`);
            this.showToast('PDF downloaded', 'success');
        } catch (error) {
            console.error('[hypergravity] PDF export error:', error);
            this.showToast('PDF export requires jspdf dependency', 'error');
        }
    }

    async exportAsDocx() {
        const exportDocument = this.buildExportDocument();
        if (!exportDocument.messages.length) {
            this.showToast('Cannot export empty chat', 'error');
            return;
        }

        try {
            const docx = await import('docx');
            const { Packer } = docx;
            const fileBase = sanitizeFilename(exportDocument.title);

            const documentFile = createDocxDocument(docx, exportDocument);

            const blob = await Packer.toBlob(documentFile);
            downloadBlob(blob, `${fileBase}_${new Date().toISOString().slice(0, 10)}.docx`);
            this.showToast('DOCX downloaded', 'success');
        } catch (error) {
            console.error('[hypergravity] DOCX export error:', error);
            this.showToast('DOCX export requires docx dependency', 'error');
        }
    }

    printChat() {
        const exportDocument = this.buildExportDocument();
        if (!exportDocument.messages.length) {
            this.showToast('Cannot print empty chat', 'error');
            return;
        }

        const html = serializeDocumentAsStyledHtml(exportDocument);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            this.showToast('Please allow popups to print', 'error');
            return;
        }

        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 300);
    }

    copyToClipboard() {
        const exportDocument = this.buildExportDocument();
        if (!exportDocument.messages.length) {
            this.showToast('Cannot copy empty chat', 'error');
            return;
        }

        const text = serializeDocumentAsText(exportDocument);

        navigator.clipboard
            .writeText(text)
            .then(() => this.showToast('Chat copied to clipboard', 'success'))
            .catch(() => this.showToast('Failed to copy chat', 'error'));
    }

    closePopup() {
        document.querySelector('#hg-export-popup-overlay')?.remove();
    }

    showPopup() {
        this.closePopup();

        const overlay = document.createElement('div');
        overlay.id = 'hg-export-popup-overlay';
        overlay.className = 'hg-export-overlay';

        const close = () => this.closePopup();

        const handleAction = async (
            format: 'copy' | 'txt' | 'md' | 'html' | 'pdf' | 'docx' | 'print'
        ) => {
            if (format === 'copy') this.copyToClipboard();
            if (format === 'txt') this.exportAsText();
            if (format === 'md') this.exportAsMarkdown();
            if (format === 'html') this.exportAsHtml();
            if (format === 'pdf') await this.exportAsPdf();
            if (format === 'docx') await this.exportAsDocx();
            if (format === 'print') this.printChat();
            close();
        };

        const exportActions: Array<{
            format: 'copy' | 'txt' | 'md' | 'html' | 'pdf' | 'docx' | 'print';
            label: string;
            Icon: typeof ClipboardExportIcon;
        }> = [
            { format: 'copy', label: 'Clipboard', Icon: ClipboardExportIcon },
            { format: 'txt', label: 'Text (.txt)', Icon: TextSnippetIcon },
            { format: 'md', label: 'Markdown (.md)', Icon: MarkdownIcon },
            { format: 'html', label: 'HTML (.html)', Icon: HtmlIcon },
            { format: 'pdf', label: 'PDF (.pdf)', Icon: PictureAsPdfIcon },
            { format: 'docx', label: 'DOCX (.docx)', Icon: DocsIcon },
            { format: 'print', label: 'Print', Icon: PrintMenuIcon },
        ];

        const ExportModal = () => (
            <div class="hg-export-popup">
                <div class="hg-export-header">
                    <h3>Export Chat</h3>
                    <button
                        class="hg-export-close"
                        type="button"
                        aria-label="Close"
                        onClick={close}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <title>Close export popup</title>
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div class="hg-export-actions">
                    {exportActions.map(({ format, label, Icon }) => (
                        <button
                            key={format}
                            type="button"
                            onClick={() => handleAction(format)}
                            class="hg-export-action"
                        >
                            <Icon class="hg-export-action-icon" />
                            <span class="hg-export-action-label">{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close();
        });

        document.body.appendChild(overlay);
        render(<ExportModal />, overlay);
    }
}
