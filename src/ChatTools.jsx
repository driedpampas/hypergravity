import React from 'react';
import './ChatTools.css';
import { WordCounter } from './tools/WordCounter';
import { OptimizeButton } from './tools/OptimizeButton';
import { TokenCounter } from './tools/TokenCounter';
import { QuickActions } from './tools/QuickActions';

export function ChatTools() {
    return (
        <>
            <div
                className="hg-chat-tools-left"
                style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    flexWrap: 'nowrap',
                    minWidth: 0,
                    maxWidth: '100%',
                }}
            >
                <WordCounter />
                <OptimizeButton />
                <TokenCounter />
                <QuickActions />
            </div>
        </>
    );
}
