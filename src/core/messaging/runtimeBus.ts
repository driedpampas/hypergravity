export type RuntimeSendMessage = <TRequest, TResponse = unknown>(
    request: TRequest
) => Promise<TResponse | null>;

export const sendRuntimeMessage: RuntimeSendMessage = async <TRequest, TResponse = unknown>(
    request: TRequest
): Promise<TResponse | null> => {
    try {
        return (await chrome.runtime.sendMessage(request)) as TResponse;
    } catch {
        return null;
    }
};
