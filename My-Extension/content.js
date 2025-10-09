// content.js

// --- CONFIGURATION ---
const DEBOUNCE_TIME = 500; // Time in ms before triggering AI suggestion
// REFINED SELECTOR: This is more specific and stable.
const CHAT_INPUT_SELECTOR = '#main div[role="textbox"][contenteditable="true"]';
const CHAT_MESSAGE_SELECTOR = 'div.message-in, div.message-out';
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

let typingTimer;
let currentDraft = "";
let currentSuggestion = "";
let suggestionElement = null; // Element to hold the ghost text
let isSuggestionDisplayed = false;
// CORRECTED: Reverted to the correct state initialization.
// The API key is received via a message from the popup after decryption.
let apiState = {
    apiKey: null,
    writingTone: 'professional'
};

// --- API CALL LOGGING ---
async function fetchSuggestion(draft, history, tone, apiKey) {
    if (!apiKey) {
        console.error("DEBUG: API call failed. Reason: API Key is not set.");
        return "ERROR: API Key not set.";
    }

    const contextText = history.map(msg => `${msg.role}: ${msg.text}`).join('\n');
    
    // --- UPDATED & STRICTER PROMPT ---
    const systemPrompt = `You are an autocomplete writing assistant. Your one and only job is to complete the user's current sentence.
- Analyze the conversation history for context.
- The user's desired tone is '${tone}'.
- CRITICAL RULE: Your response MUST start with the user's exact draft text. For example, if the draft is "hello how are", your response must be something like "hello how are you today?".
- DO NOT rephrase the user's text. Only complete it.
- Provide ONLY the final, completed sentence and nothing else.

Context:
---
${contextText}
---
User's Draft: "${draft}"`;

    const payload = {
        contents: [{ parts: [{ text: "Complete the draft based on the context." }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    try {
        const response = await fetch(GEMINI_API_URL + `?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const result = await response.json();
        const suggestionText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        console.log("DEBUG: Raw suggestion from API:", `"${suggestionText}"`);
        return suggestionText;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Error fetching suggestion.";
    }
}

function getConversationHistory() {
    const messages = document.querySelectorAll(CHAT_MESSAGE_SELECTOR);
    const history = [];
    messages.forEach(msgDiv => {
        const textElement = msgDiv.querySelector('.selectable-text span');
        const text = textElement ? textElement.textContent.trim() : '';
        if (text) {
            const role = msgDiv.classList.contains('message-out') ? 'YOU' : 'THEM';
            history.push({ role, text });
        }
    });
    console.log("DEBUG: Captured conversation history:", history);
    return history.slice(-10);
}

// --- DOM MANIPULATION ---
function repositionSuggestionElement(inputElement) {
    if (!suggestionElement) return;
    const inputRect = inputElement.getBoundingClientRect();
    const inputStyle = window.getComputedStyle(inputElement);
    Object.assign(suggestionElement.style, {
        position: 'fixed',
        top: `${inputRect.top}px`,
        left: `${inputRect.left - 1}px`,
        width: `${inputRect.width}px`,
        height: `${inputRect.height}px`,
        padding: inputStyle.padding,
        font: inputStyle.font,
        lineHeight: inputStyle.lineHeight,
        visibility: 'visible'
    });
}

function createSuggestionElement() {
    let ghost = document.getElementById('chat-catalyst-ghost');
    if (ghost) ghost.remove();
    ghost = document.createElement('div');
    ghost.id = 'chat-catalyst-ghost';
    Object.assign(ghost.style, {
        color: '#B0B0B0',
        pointerEvents: 'none',
        zIndex: '9999',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
    });
    document.body.appendChild(ghost);
    return ghost;
}

function updateSuggestionDOM(inputElement) {
    if (!suggestionElement) return;
    repositionSuggestionElement(inputElement);
    
    const isError = currentSuggestion.toLowerCase().includes("error");
    const isCompletion = currentSuggestion.toLowerCase().startsWith(currentDraft.toLowerCase());
    const shouldDisplay = currentDraft && currentSuggestion && !isError && isCompletion;
    
    if (!shouldDisplay && currentSuggestion && !isError) { 
         console.log(`DEBUG: Suggestion HIDDEN. Reason: ${!isCompletion ? "Suggestion is not a completion." : "An unknown condition failed."} (Draft: "${currentDraft}", Suggestion: "${currentSuggestion}")`);
    }

    if (shouldDisplay) {
        const completionText = currentSuggestion.substring(currentDraft.length);
        suggestionElement.innerHTML = `<span style="color: transparent;">${currentDraft}</span><span style="opacity: 0.6;">${completionText}</span>`;
        isSuggestionDisplayed = true;
    } else {
        suggestionElement.textContent = "";
        isSuggestionDisplayed = false;
    }
}


// --- MAIN EVENT HANDLERS ---
function handleInput(event) {
    console.log("Chat Catalyst: handleInput triggered!");
    
    currentDraft = event.target.textContent.trim();
    clearTimeout(typingTimer);
    updateSuggestionDOM(event.target);

    if (currentDraft.length < 3) return;

    console.log("DEBUG: Draft is long enough. Setting timeout for API call...");

    typingTimer = setTimeout(async () => {
        console.log("DEBUG: Timeout finished. Fetching suggestion...");
        const history = getConversationHistory();
        const suggestion = await fetchSuggestion(currentDraft, history, apiState.writingTone, apiState.apiKey);
        
        if (event.target.textContent.trim() === currentDraft) {
            currentSuggestion = suggestion;
            updateSuggestionDOM(event.target);
        } else {
            console.log("DEBUG: Draft changed while waiting for API. Suggestion ignored.");
        }
    }, DEBOUNCE_TIME);
}

function handleKeydown(event) {
    if (event.key === 'Tab' && isSuggestionDisplayed && currentSuggestion) {
        console.log("Chat Catalyst: Tab pressed to accept suggestion.");
        event.preventDefault(); // Stop the default Tab action

        // 1. Calculate the part of the suggestion that the user hasn't typed yet.
        // For example, if draft is "how are" and suggestion is "how are you",
        // this will be " you".
        const completionText = currentSuggestion.substring(currentDraft.length);

        // 2. Insert ONLY the new text at the current cursor position.
        document.execCommand('insertText', false, completionText);

        // 3. Clean up the state.
        currentSuggestion = "";
        isSuggestionDisplayed = false;
        updateSuggestionDOM(event.target); // This will clear the ghost text
    }
}


// --- INITIALIZATION ---
function initializeAssistant() {
    console.log("Chat Catalyst: Observer initialized. Waiting for input field...");
    const observer = new MutationObserver((mutations, obs) => {
        const inputElement = document.querySelector(CHAT_INPUT_SELECTOR);

        if (inputElement && !inputElement.dataset.assistantInitialized) {
            console.log("Chat Catalyst: Input field found! Attaching listeners.", inputElement);

            inputElement.addEventListener('input', handleInput);
            // CRITICAL FIX: The 'true' at the end enables event capturing.
            inputElement.addEventListener('keydown', handleKeydown, true);
            inputElement.dataset.assistantInitialized = 'true';

            if (!suggestionElement) {
                suggestionElement = createSuggestionElement();
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "settingsUpdated") {
        apiState.apiKey = request.apiKey;
        apiState.writingTone = request.tone;
        console.log(`Chat Catalyst: Settings UPDATED live. Tone set to -> ${apiState.writingTone}`);
        sendResponse({ status: "success" });
        return true;
    }
})

function requestInitialSettings() {
    console.log("Chat Catalyst: Requesting initial settings from background script...");
    chrome.runtime.sendMessage({ action: "getInitialSettings" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Chat Catalyst: Could not get settings.", chrome.runtime.lastError);
            return;
        }
        
        if (response && response.apiKey) {
            apiState.apiKey = response.apiKey;
            apiState.writingTone = response.tone;
            console.log(`Chat Catalyst: Settings LOADED on init. Tone is -> ${apiState.writingTone}`);
        } else {
            console.log("Chat Catalyst: No API key found in storage.");
        }
    });
}



requestInitialSettings(); // Request settings as soon as the script loads
initializeAssistant();    // Initialize the assistant to start observing the DOM

