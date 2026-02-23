import React from 'react';
import './ChatTools.css';
import { WordCounter } from './tools/WordCounter';
import { OptimizeButton } from './tools/OptimizeButton';
import { TokenCounter } from './tools/TokenCounter';
import { QuickActions } from './tools/QuickActions';
import { ScrollButtons } from './tools/ScrollButtons';

const TOOLS = [
    { component: WordCounter, align: 'left', weight: 0 },
    { component: OptimizeButton, align: 'left', weight: 1 },
    { component: QuickActions, align: 'left', weight: 3 },
    { component: TokenCounter, align: 'right', weight: 1 },
    { component: ScrollButtons, align: 'right', weight: 0 },
];

function sortByWeight(tools) {
    const seen = new Map();
    const sorted = [...tools].sort((a, b) => a.weight - b.weight);

    return sorted.map((tool) => {
        const key = `${tool.align}:${tool.weight}`;
        if (seen.has(key)) {
            console.warn(
                `[hypergravity] Duplicate tool weight ${tool.weight} on "${tool.align}" side — ` +
                    `"${tool.component.name}" collides with "${seen.get(key)}". Appending after.`
            );
        }
        seen.set(key, tool.component.name || 'anonymous');
        return tool;
    });
}

const SORTED_TOOLS = sortByWeight(TOOLS);

const toolGroupStyle = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'nowrap',
    minWidth: 0,
};

export function ChatTools() {
    const left = SORTED_TOOLS.filter((t) => t.align === 'left');
    const right = SORTED_TOOLS.filter((t) => t.align === 'right');

    return (
        <div
            className="hg-chat-tools"
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
            }}
        >
            <div className="hg-chat-tools-left" style={toolGroupStyle}>
                {left.map(({ component: C }, i) => (
                    <C key={i} />
                ))}
            </div>
            {right.length > 0 && (
                <div
                    className="hg-chat-tools-right"
                    style={{ ...toolGroupStyle, justifyContent: 'flex-end' }}
                >
                    {right.map(({ component: C }, i) => (
                        <C key={i} />
                    ))}
                </div>
            )}
        </div>
    );
}
