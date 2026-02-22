import React from 'react';
import { createRoot } from 'react-dom/client';
import './content.css';
import SvgComponent from './Icon.jsx';

function insertHypergravityButton() {
    // Find the container with class 'chat-history'
    const chatHistory = document.querySelector('.chat-history');

    if (!chatHistory || document.querySelector('#hypergravity-btn')) {
        return;
    }

    const btn = document.createElement('button');
    btn.id = 'hypergravity-btn';
    // Use Gemini sidebar item classes for a more native look and feel
    btn.className = 'hypergravity-injected-btn';

    // Add an SVG meteor / falling star icon via React
    const iconSpan = document.createElement('span');
    btn.appendChild(iconSpan);
    createRoot(iconSpan).render(<SvgComponent className="hypergravity-icon" color="var(--gem-sys-color--on-surface)" />);

    const textSpan = document.createElement('span');
    textSpan.textContent = 'Hypergravity';
    textSpan.className = 'hypergravity-text';

    btn.appendChild(textSpan);

    btn.addEventListener('click', () => {
        console.log('Hypergravity button clicked!');
    });

    // Insert above the chat-history container
    chatHistory.parentNode.insertBefore(btn, chatHistory);
}

// Since gemini.google.com is likely a Single Page App, we use a MutationObserver
const observer = new MutationObserver((mutations) => {
    if (
        document.querySelector('.chat-history') &&
        !document.querySelector('#hypergravity-btn')
    ) {
        insertHypergravityButton();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});

// Try to insert on initial load
insertHypergravityButton();
