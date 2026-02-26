// @ts-nocheck
export function ChatTool({
    id,
    align = 'left',
    visible = true,
    className = '',
    style = {},
    children,
}) {
    if (!visible) return null;

    return (
        <div
            data-hg-tool-id={id}
            data-hg-align={align}
            class={`hg-chat-tool ${className}`}
            style={style}
        >
            {children}
        </div>
    );
}
