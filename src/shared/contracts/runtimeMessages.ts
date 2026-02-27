export const RUNTIME_MESSAGE_TYPES = {
    optimizePrompt: 'OPTIMIZE_PROMPT',
    summarizeChatMemory: 'SUMMARIZE_CHAT_MEMORY',
    cancelOptimization: 'CANCEL_OPTIMIZATION',
} as const;

export type TranscriptMessage = {
    role?: string;
    text?: string;
};

export type ChatMemoryRecord = {
    chatId: string;
    summary: string;
    sourceHash: string | null;
    messageCount: number;
    updatedAt: number;
};

export type OptimizePromptRequest = {
    type: (typeof RUNTIME_MESSAGE_TYPES)['optimizePrompt'];
    prompt?: string;
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

export type RuntimeMessage =
    | OptimizePromptRequest
    | CancelOptimizationRequest
    | SummarizeChatMemoryRequest;

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
