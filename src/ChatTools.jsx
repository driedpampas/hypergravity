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

export function ChatTools() {
    const left = SORTED_TOOLS.filter((t) => t.align === 'left');
    const right = SORTED_TOOLS.filter((t) => t.align === 'right');

    return (
        <div className="hg-chat-tools-shell">
            <div className="hg-chat-tools-rail">
                <div className="hg-chat-tools hg-chat-tools-left">
                    {left.map(({ component: C }, i) => (
                        <C key={i} />
                    ))}
                </div>
                {right.length > 0 && (
                    <div className="hg-chat-tools hg-chat-tools-right">
                    {right.map(({ component: C }, i) => (
                        <C key={i} />
                    ))}
                    </div>
                )}
            </div>
        </div>
    );
}
