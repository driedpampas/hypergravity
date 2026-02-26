import type { ComponentChildren, CSSProperties } from 'preact';

type ChatToolProps = {
    id: string;
    align?: 'left' | 'right';
    visible?: boolean;
    className?: string;
    style?: CSSProperties;
    children?: ComponentChildren;
};

export function ChatTool({
    id,
    align = 'left',
    visible = true,
    className = '',
    style = {},
    children,
}: ChatToolProps) {
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
