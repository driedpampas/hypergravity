export type ChatRole = 'User' | 'Gemini';

export type ExportDocument = {
    title: string;
    exportedAt: Date;
    messages: ExportMessage[];
};

export type ExportMessage = {
    role: ChatRole;
    blocks: ExportBlock[];
};

export type ExportBlock =
    | ExportParagraphBlock
    | ExportHeadingBlock
    | ExportListBlock
    | ExportCodeBlock
    | ExportQuoteBlock
    | ExportHrBlock;

export type ExportParagraphBlock = {
    type: 'paragraph';
    inlines: ExportInline[];
};

export type ExportHeadingBlock = {
    type: 'heading';
    level: number;
    inlines: ExportInline[];
};

export type ExportListBlock = {
    type: 'list';
    ordered: boolean;
    items: ExportBlock[][];
};

export type ExportCodeBlock = {
    type: 'codeBlock';
    code: string;
    language?: string;
};

export type ExportQuoteBlock = {
    type: 'quote';
    blocks: ExportBlock[];
};

export type ExportHrBlock = {
    type: 'hr';
};

export type ExportInline = ExportTextInline | ExportCodeInline;

export type ExportTextInline = {
    type: 'text';
    text: string;
};

export type ExportCodeInline = {
    type: 'code';
    code: string;
};
