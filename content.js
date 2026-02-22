import "./content.css";

function insertHypergravityButton() {
  // Find the container with class 'chat-history' (accounting for typos like 'dov' -> 'div')
  const chatHistory = document.querySelector(".chat-history");

  if (!chatHistory || document.querySelector("#hypergravity-btn")) {
    return;
  }

  const btn = document.createElement("button");
  btn.id = "hypergravity-btn";
  btn.textContent = "hypergravity";
  btn.className = "hypergravity-injected-btn";

  btn.addEventListener("click", () => {
    console.log("Hypergravity button clicked!");
  });

  // Insert above the chat-history container
  chatHistory.parentNode.insertBefore(btn, chatHistory);
}

// Since gemini.google.com is likely a Single Page App, we use a MutationObserver
const observer = new MutationObserver((mutations) => {
  if (
    document.querySelector(".chat-history") &&
    !document.querySelector("#hypergravity-btn")
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
