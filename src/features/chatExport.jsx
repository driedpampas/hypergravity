import { render } from 'preact';

function sanitizeFilename(value) {
    return (value || 'Gemini_Chat')
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .slice(0, 60);
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 200);
}

export class ChatExportController {
    constructor({ showToast, findActiveChatInfo }) {
        this.showToast = showToast;
        this.findActiveChatInfo = findActiveChatInfo;
    }

    getChatHistory() {
        const userSelectors = [
            'user-query',
            '.user-message',
            '[data-message-author="user"]',
            '.query-content',
        ];

        const allSelectors = [
            ...userSelectors,
            'model-response',
            '.model-response',
            '[data-message-author="model"]',
            'message-content .markdown-main-panel',
            'generative-ui-response',
            'response-container',
        ].join(', ');

        let nodes = Array.from(document.querySelectorAll(allSelectors));
        nodes = nodes.filter(
            (node, index, arr) =>
                !arr.some(
                    (other, otherIndex) =>
                        index !== otherIndex && other.contains(node)
                )
        );

        return nodes
            .map((node) => {
                const isUser = userSelectors.some(
                    (selector) =>
                        node.matches(selector) || node.closest(selector)
                );
                const text = (node.innerText || '').trim();
                if (!text) return null;

                return {
                    role: isUser ? 'User' : 'Gemini',
                    text,
                    timestamp: '',
                };
            })
            .filter(Boolean);
    }

    formatTextExport(messages, title) {
        let output = `${title}\nExported using hypergravity on: ${new Date().toLocaleString()}\n\n`;
        messages.forEach((msg) => {
            output += `${msg.role}\n\n${msg.text}\n\n`;
        });
        return output;
    }

    exportAsText() {
        const messages = this.getChatHistory();
        if (!messages.length) {
            this.showToast('Cannot export empty chat', 'error');
            return;
        }

        const chat = this.findActiveChatInfo();
        const title = chat?.title || 'Gemini Chat';
        const text = this.formatTextExport(messages, title);
        const fileBase = sanitizeFilename(title);

        downloadBlob(
            new Blob([text], { type: 'text/plain' }),
            `${fileBase}_${new Date().toISOString().slice(0, 10)}.txt`
        );

        this.showToast('Text downloaded', 'success');
    }

    async exportAsPdf() {
        const messages = this.getChatHistory();
        if (!messages.length) {
            this.showToast('Cannot export empty chat', 'error');
            return;
        }

        try {
            const { jsPDF } = await import('jspdf');
            const chat = this.findActiveChatInfo();
            const title = chat?.title || 'Gemini Chat';
            const fileBase = sanitizeFilename(title);

            const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 48;
            const maxWidth = pageWidth - margin * 2;

            let y = margin;
            pdf.setFontSize(16);
            pdf.text(title, margin, y);
            y += 24;
            pdf.setFontSize(10);
            pdf.text(
                `Exported using hypergravity on: ${new Date().toLocaleString()}`,
                margin,
                y
            );
            y += 22;

            const ensureSpace = (needed = 18) => {
                const pageHeight = pdf.internal.pageSize.getHeight();
                if (y + needed > pageHeight - margin) {
                    pdf.addPage();
                    y = margin;
                }
            };

            messages.forEach((msg) => {
                ensureSpace(24);
                pdf.setFontSize(11);
                pdf.setFont(undefined, 'bold');
                pdf.text(msg.role, margin, y);
                y += 16;

                pdf.setFont(undefined, 'normal');
                pdf.setFontSize(10);
                const lines = pdf.splitTextToSize(msg.text, maxWidth);
                lines.forEach((line) => {
                    ensureSpace(14);
                    pdf.text(line, margin, y);
                    y += 14;
                });
                y += 10;
            });

            pdf.save(
                `${fileBase}_${new Date().toISOString().slice(0, 10)}.pdf`
            );
            this.showToast('PDF downloaded', 'success');
        } catch (error) {
            console.error('[hypergravity] PDF export error:', error);
            this.showToast('PDF export requires jspdf dependency', 'error');
        }
    }

    async exportAsDocx() {
        const messages = this.getChatHistory();
        if (!messages.length) {
            this.showToast('Cannot export empty chat', 'error');
            return;
        }

        try {
            const docx = await import('docx');
            const { Document, Packer, Paragraph, TextRun } = docx;
            const chat = this.findActiveChatInfo();
            const title = chat?.title || 'Gemini Chat';
            const fileBase = sanitizeFilename(title);

            const children = [
                new Paragraph({
                    children: [
                        new TextRun({ text: title, bold: true, size: 32 }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Exported using hypergravity on: ${new Date().toLocaleString()}`,
                            size: 20,
                        }),
                    ],
                }),
                new Paragraph({ text: '' }),
            ];

            messages.forEach((msg) => {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: msg.role,
                                bold: true,
                                size: 24,
                            }),
                        ],
                    })
                );

                msg.text.split('\n').forEach((line) => {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: line, size: 22 })],
                        })
                    );
                });

                children.push(new Paragraph({ text: '' }));
            });

            const documentFile = new Document({
                sections: [{ children }],
            });

            const blob = await Packer.toBlob(documentFile);
            downloadBlob(
                blob,
                `${fileBase}_${new Date().toISOString().slice(0, 10)}.docx`
            );
            this.showToast('DOCX downloaded', 'success');
        } catch (error) {
            console.error('[hypergravity] DOCX export error:', error);
            this.showToast('DOCX export requires docx dependency', 'error');
        }
    }

    printChat() {
        const messages = this.getChatHistory();
        if (!messages.length) {
            this.showToast('Cannot print empty chat', 'error');
            return;
        }

        const chat = this.findActiveChatInfo();
        const title = chat?.title || 'Gemini Chat';

        const html = `
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: 'Google Sans Flex', 'Google Sans', 'Helvetica Neue', sans-serif; padding: 24px; max-width: 900px; margin: 0 auto; }
                        .msg { margin-bottom: 22px; }
                        .role { font-weight: 700; margin-bottom: 8px; }
                        .text { white-space: pre-wrap; line-height: 1.5; }
                    </style>
                </head>
                <body>
                    <h1>${title}</h1>
                    <p>Exported using hypergravity on: ${new Date().toLocaleString()}</p>
                    ${messages
                        .map(
                            (msg) =>
                                `<div class="msg"><div class="role">${msg.role}</div><div class="text">${msg.text
                                    .replace(/&/g, '&amp;')
                                    .replace(/</g, '&lt;')
                                    .replace(/>/g, '&gt;')}</div></div>`
                        )
                        .join('')}
                </body>
            </html>
        `;

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
        const messages = this.getChatHistory();
        if (!messages.length) {
            this.showToast('Cannot copy empty chat', 'error');
            return;
        }

        const chat = this.findActiveChatInfo();
        const title = chat?.title || 'Gemini Chat';
        const text = this.formatTextExport(messages, title);

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

        const handleAction = async (format) => {
            if (format === 'copy') this.copyToClipboard();
            if (format === 'txt') this.exportAsText();
            if (format === 'pdf') await this.exportAsPdf();
            if (format === 'docx') await this.exportAsDocx();
            if (format === 'print') this.printChat();
            close();
        };

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
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div class="hg-export-actions">
                    <button
                        onClick={() => handleAction('copy')}
                        class="hg-export-action"
                    >
                        Copy to Clipboard
                    </button>
                    <button
                        onClick={() => handleAction('txt')}
                        class="hg-export-action"
                    >
                        Export as .txt
                    </button>
                    <button
                        onClick={() => handleAction('pdf')}
                        class="hg-export-action"
                    >
                        Export as .pdf
                    </button>
                    <button
                        onClick={() => handleAction('docx')}
                        class="hg-export-action"
                    >
                        Export as .docx
                    </button>
                    <button
                        onClick={() => handleAction('print')}
                        class="hg-export-action"
                    >
                        Print Chat
                    </button>
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
