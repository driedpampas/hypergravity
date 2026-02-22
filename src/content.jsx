import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Sidebar } from './Sidebar';
import { ChatTools } from './ChatTools';

function insertHypergravitySidebar() {
    // Attempt to find the target injection point like the original extension
    let target = document.querySelector("conversations-list");
    let needsAfterEnd = false;
    
    if (!target) {
        const gemsList = document.querySelector(".gems-list-container");
        if (gemsList) {
            target = gemsList.parentElement;
            needsAfterEnd = true;
        } else {
            const sideNav = document.querySelector('bard-sidenav infinite-scroller') || 
                            document.querySelector('infinite-scroller[scrollable="true"]') ||
                            document.querySelector('.conversations-container');
            if (sideNav) {
                target = sideNav;
                needsAfterEnd = false;
            }
        }
    }

    if (!target || target === document.body || document.querySelector('#hypergravity-root')) {
        return;
    }

    const rootElement = document.createElement('div');
    rootElement.id = 'hypergravity-root';
    rootElement.style.cssText = "margin: 0 12px 8px 12px; overflow: visible; transition: margin-top 0.2s ease;";
    
    if (needsAfterEnd) {
        const gemsList = document.querySelector(".gems-list-container");
        if (gemsList) {
            gemsList.insertAdjacentElement("afterend", rootElement);
        } else {
            target.prepend(rootElement);
        }
    } else {
        target.prepend(rootElement);
    }
    
    createRoot(rootElement).render(<Sidebar />);

    // Inject Chat Tools globally attached to body
    if (!document.querySelector('#hypergravity-chat-tools-root')) {
        const toolsRootElement = document.createElement('div');
        toolsRootElement.id = 'hypergravity-chat-tools-root';
        document.body.appendChild(toolsRootElement);
        createRoot(toolsRootElement).render(<ChatTools />);
    }
}

// Since gemini.google.com is likely a Single Page App, we use a MutationObserver
const observer = new MutationObserver((mutations) => {
    if (!document.querySelector('#hypergravity-root')) {
        insertHypergravitySidebar();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});

// Try to insert on initial load
insertHypergravitySidebar();
