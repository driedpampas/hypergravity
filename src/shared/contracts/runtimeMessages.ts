export const RUNTIME_MESSAGE_TYPES = {
    optimizePrompt: 'OPTIMIZE_PROMPT',
    summarizeChatMemory: 'SUMMARIZE_CHAT_MEMORY',
    openBranchWindow: 'OPEN_BRANCH_WINDOW',
    cancelOptimization: 'CANCEL_OPTIMIZATION',
} as const;

export type TranscriptMessage = {
    role?: string;
    text?: string;
};

export type MemorySummaryStructured = {
    context: string[];
    userPreferences: string[];
    decisions: string[];
    openThreads: string[];
    nextUsefulActions: string[];
};

export type ChatMemoryRecord = {
    chatId: string;
    summary: string;
    summaryStructured?: MemorySummaryStructured;
    chatTitle?: string;
    chatTitleUserModified?: boolean;
    detectedChatTitle?: string;
    sourceHash: string | null;
    messageCount: number;
    updatedAt: number;
};

export type OptimizePromptRequest = {
    type: (typeof RUNTIME_MESSAGE_TYPES)['optimizePrompt'];
    prompt?: string;
    sourceUrl?: string;
};

export type CancelOptimizationRequest = {
    type: (typeof RUNTIME_MESSAGE_TYPES)['cancelOptimization'];
};

export type SummarizeChatMemoryRequest = {
    type: (typeof RUNTIME_MESSAGE_TYPES)['summarizeChatMemory'];
    chatId?: string;
    messages?: TranscriptMessage[];
    sourceHash?: string;
};

export type OpenBranchWindowRequest = {
    type: (typeof RUNTIME_MESSAGE_TYPES)['openBranchWindow'];
    url?: string;
};

export type RuntimeMessage =
    | OptimizePromptRequest
    | CancelOptimizationRequest
    | SummarizeChatMemoryRequest
    | OpenBranchWindowRequest;

export type OptimizePromptResponse = {
    success: boolean;
    optimizedPrompt?: string;
    error?: string;
};

export type SummarizeChatMemoryResponse = {
    success: boolean;
    memory?: ChatMemoryRecord;
    skipped?: boolean;
    error?: string;
};

export type OpenBranchWindowResponse = {
    success: boolean;
    error?: string;
};
