import { useState, useEffect } from 'preact/hooks';
import { countText } from '../utils/textStats';
import { chatBoxManager } from '../managers/chatBoxManager';

export function WordCounter() {
    const [textStats, setTextStats] = useState(countText(''));
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const updateCount = () => {
            const text = chatBoxManager.getInputText();
            setTextStats(countText(text));
        };

        updateCount();
        document.addEventListener('input', updateCount);
        document.addEventListener('keyup', updateCount);
        const interval = setInterval(updateCount, 1000);

        return () => {
            document.removeEventListener('input', updateCount);
            document.removeEventListener('keyup', updateCount);
            clearInterval(interval);
        };
    }, []);

    return (
        <div
            id="hg-word-counter"
            class={isExpanded ? 'expanded' : ''}
            onClick={() => setIsExpanded(!isExpanded)}
            tabIndex="0"
        >
            <div class="hg-counter-summary">
                <strong>{textStats.words}</strong>&nbsp;words /&nbsp;
                <strong>{textStats.chars}</strong>&nbsp;characters
            </div>
            {isExpanded && (
                <div class="hg-counter-details">
                    <div class="hg-stat-row">
                        <span>Chars:</span> <strong>{textStats.chars}</strong>
                    </div>
                    <div class="hg-stat-row">
                        <span>Chars (w/o spaces):</span>{' '}
                        <strong>{textStats.charsNoSpace}</strong>
                    </div>
                    <div class="hg-stat-row">
                        <span>Words:</span> <strong>{textStats.words}</strong>
                    </div>
                    <div class="hg-stat-row">
                        <span>Sentences:</span>{' '}
                        <strong>{textStats.sentences}</strong>
                    </div>
                    <div class="hg-stat-row">
                        <span>Paragraphs:</span>{' '}
                        <strong>{textStats.paragraphs}</strong>
                    </div>
                    <div class="hg-stat-row">
                        <span>Lines:</span> <strong>{textStats.lines}</strong>
                    </div>
                    <div class="hg-stat-row">
                        <span>Tokens (~est):</span>{' '}
                        <strong>{textStats.tokens}</strong>
                    </div>
                </div>
            )}
        </div>
    );
}
