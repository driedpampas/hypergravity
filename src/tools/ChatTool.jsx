import React from 'react';

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
            className={`hg-chat-tool ${className}`}
            style={style}
        >
            {children}
        </div>
    );
}
