import React, { useState, useEffect } from 'react';
import './ChatTools.css';
import { useChromeStorage } from './hooks/useChromeStorage';

function countText(text) {
  if (!text) return { words: 0, chars: 0, charsNoSpace: 0, lines: 0, sentences: 0, paragraphs: 0, tokens: 0 };
  
  const trimmed = text.trim();
  const noSpaceStr = text.replace(/\r\n/g, "").replace(/\r/g, "").replace(/\n/g, "");
  const chars = noSpaceStr.length;
  const charsNoSpace = noSpaceStr.replace(/\s/g, "").length;
  
  let validWordMatches = 0;
  let workStr = text;
  
  const urls = /(?:https?:\/\/|ftp:\/\/|www\.)[^\s]+/gi;
  validWordMatches += (workStr.match(urls) || []).length;
  workStr = workStr.replace(urls, " ");
  
  const emails = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  validWordMatches += (workStr.match(emails) || []).length;
  workStr = workStr.replace(emails, " ");
  
  const ips = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  validWordMatches += (workStr.match(ips) || []).length;
  workStr = workStr.replace(ips, " ");
  
  const paths = /[a-zA-Z0-9_-]+(?:[\/\\][a-zA-Z0-9_.-]+)+/g;
  validWordMatches += (workStr.match(paths) || []).length;
  workStr = workStr.replace(paths, " ");
  
  const decimals = /\b\d+\.\d+\b/g;
  validWordMatches += (workStr.match(decimals) || []).length;
  workStr = workStr.replace(decimals, " ");
  
  validWordMatches += (workStr.match(/[\w\d''-]+/gi) || []).length;
  
  const wordsCount = validWordMatches;
  const sentencesCount = (text.match(/[^\.!\?]+[\.!\?]+/g) || []).length || (wordsCount > 0 ? 1 : 0);
  
  const linesCountRaw = trimmed.replace(/\r?\n\r?\n+/g, "\n\n").split(/\r?\n/).filter(e => e !== "").length;
  const linesCount = trimmed.length === 0 ? 0 : Math.max(1, linesCountRaw);
  
  const paragraphsCount = trimmed.length === 0 ? 0 : trimmed.split(/(?:\r?\n){3,}/).filter(e => e.trim().length > 0).length;
  
  const punctuationCount = (text.match(/[^\w\s]/g) || []).length;
  const tokens = Math.ceil(wordsCount + 0.5 * punctuationCount + 0.3 * (charsNoSpace / 4 - wordsCount));
  
  return {
      words: wordsCount,
      chars: chars,
      charsNoSpace: charsNoSpace,
      lines: linesCount,
      sentences: sentencesCount,
      paragraphs: paragraphsCount,
      tokens: Math.max(0, tokens),
  };
}

export function ChatTools() {
  const [textStats, setTextStats] = useState(countText(""));
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ bottom: 0, left: 0, show: false });
  const [optimizePos, setOptimizePos] = useState({ bottom: 0, left: 0 });
  const [quickActions, setQuickActions] = useChromeStorage('quickActions', []);

  // Watch for input changes and scroll/resize to position
  useEffect(() => {
    const updatePositionAndCount = () => {
      // Find the Gemini input box
      const inputEl = document.querySelector('.ql-editor[contenteditable="true"]') 
                   || document.querySelector('textarea[placeholder*="Enter"]')
                   || document.querySelector('[contenteditable="true"][role="textbox"]');

      if (!inputEl) {
        setPosition(prev => ({ ...prev, show: false }));
        return;
      }

      // Read text content
      const text = inputEl.innerText || inputEl.value || "";
      setTextStats(countText(text));

      // Calculate position (hovering above the input box)
      const rect = inputEl.getBoundingClientRect();
      const bottom = window.innerHeight - rect.top; // offset from top of input
      
      setPosition({
        bottom: bottom,
        left: rect.left,
        show: true
      });
      
      // Optimize button is placed to the top right of the token counter
      setOptimizePos({
        bottom: bottom,
        left: rect.left // offset roughly past the token counter
      });
    };

    updatePositionAndCount();

    // Listen to events
    window.addEventListener("scroll", updatePositionAndCount, { passive: true });
    window.addEventListener("resize", updatePositionAndCount);
    document.addEventListener("input", updatePositionAndCount);
    document.addEventListener("keyup", updatePositionAndCount);

    const interval = setInterval(updatePositionAndCount, 1000); // Fail-safe polling

    return () => {
      window.removeEventListener("scroll", updatePositionAndCount);
      window.removeEventListener("resize", updatePositionAndCount);
      document.removeEventListener("input", updatePositionAndCount);
      document.removeEventListener("keyup", updatePositionAndCount);
      clearInterval(interval);
    };
  }, []);

  if (!position.show) return null;

  return (
    <>
      <div 
        id="hg-word-counter" 
        className={isExpanded ? 'expanded' : ''}
        style={{ bottom: position.bottom + 'px', left: position.left + 'px' }}
        onClick={() => setIsExpanded(!isExpanded)}
        tabIndex="0"
      >
        <div className="hg-counter-summary">
          <strong>{textStats.words}</strong>&nbsp;words /&nbsp;<strong>{textStats.chars}</strong>&nbsp;characters
        </div>
        {isExpanded && (
          <div className="hg-counter-details">
            <div className="hg-stat-row"><span>Chars (space):</span> <strong>{textStats.chars}</strong></div>
            <div className="hg-stat-row"><span>Chars (no space):</span> <strong>{textStats.charsNoSpace}</strong></div>
            <div className="hg-stat-row"><span>Words:</span> <strong>{textStats.words}</strong></div>
            <div className="hg-stat-row"><span>Sentences:</span> <strong>{textStats.sentences}</strong></div>
            <div className="hg-stat-row"><span>Paragraphs:</span> <strong>{textStats.paragraphs}</strong></div>
            <div className="hg-stat-row"><span>Lines:</span> <strong>{textStats.lines}</strong></div>
            <div className="hg-stat-row"><span>Tokens (~est):</span> <strong>{textStats.tokens}</strong></div>
          </div>
        )}
      </div>

      <button 
        id="hg-optimize-prompt-btn" 
        className="hg-optimize-btn"
        style={{ bottom: optimizePos.bottom + 'px', left: optimizePos.left + 'px' }}
        title="Optimize prompt with AI"
        aria-label="Optimize prompt with AI"
      >
        <svg className="hg-optimize-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
            <path d="M20 3v4"/>
            <path d="M22 5h-4"/>
            <path d="M4 17v2"/>
            <path d="M5 18H3"/>
        </svg>
        <span className="hg-optimize-label">Optimize</span>
      </button>

      {/* Render matching Quick Actions */}
      <div 
        id="hg-quick-action-buttons" 
        style={{ 
          position: 'fixed',
          display: 'flex',
          gap: '8px',
          bottom: position.bottom + 'px', 
          left: (optimizePos.left) + 'px',
          zIndex: 999
        }}
      >
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            className="hg-optimize-btn"
            style={{ backgroundColor: action.color || 'var(--gem-sys-color--surface-container)' }}
            title={action.prompt || action.name}
            onClick={() => {
                const inputEl = document.querySelector('.ql-editor[contenteditable="true"]');
                if (inputEl) {
                    inputEl.innerText = action.prompt;
                    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }}
          >
            {action.icon && <span style={{ marginRight: '4px' }}>{action.icon}</span>}
            <span className="hg-optimize-label">{action.name}</span>
          </button>
        ))}
      </div>
    </>
  );
}
