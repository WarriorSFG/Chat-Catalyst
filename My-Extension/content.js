// content.js

// --- CONFIGURATION ---
const DEBOUNCE_TIME = 300; // Time in ms before triggering AI suggestion
const CHAT_INPUT_SELECTOR = '#main div[role="textbox"][contenteditable="true"]';

const CHAT_MESSAGE_SELECTOR = 'div.message-in, div.message-out';
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";
const MIC_BUTTON_SELECTOR = '[aria-label="Send"]';
const AI_BUTTON_ID = 'chat-catalyst-ai-button';
const SuggestionsEnabled = false; // Set to false to disable suggestions

let ChatInput = ""; // Global variable to hold the rewritten text
let typingTimer;
let currentDraft = "";
let currentSuggestion = "";
let suggestionElement = null;
let isSuggestionDisplayed = false;
let apiState = {
    apiKey: null,
    writingTone: 'professional'
};

// --- API FUNCTIONS (Unchanged) ---
async function fetchSuggestion(draft, history, tone, apiKey) {
    if (!apiKey) {
        console.error("DEBUG: API call failed. Reason: API Key is not set.");
        return "ERROR: API Key not set.";
    }

    const contextText = history.map(msg => `${msg.role}: ${msg.text}`).join('\n');
    
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

async function ReWriteSentence(draft, history, tone, apiKey) {
    if (!apiKey) {
        console.error("DEBUG: API call failed. Reason: API Key is not set.");
        return "ERROR: API Key not set.";
    }

    const contextText = history.map(msg => `${msg.role}: ${msg.text}`).join('\n');
    
    const systemPrompt = `You are a rewriting assistant. Your one and only job is to rewrite the user's current sentence in a more refined, structured and grammatically correct way in the '${tone}' tone.
- Analyze the conversation history for context.
- Rephrase the user's text. Complete it if needed.
- Provide ONLY the final, rewritten sentence and nothing else.
- The first word of your response MUST be the first word of the user's original text. For example, if the user's text is "hello how are", your response must start with "hello".

Context:
---
${contextText}
---
User's sentence: "${draft}"`;

    const payload = {
        contents: [{ parts: [{ text: "Rewrite the sentence in more refined, structured and grammatically correct way." }] }],
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

// --- DOM MANIPULATION (Mostly Unchanged) ---
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

// --- EVENT HANDLERS (Unchanged) ---
function handleInput(event) {
    currentDraft = event.target.textContent.trim();
    clearTimeout(typingTimer);
    updateSuggestionDOM(event.target);

    if (currentDraft.length < 3) return;

    typingTimer = setTimeout(async () => {
        const history = getConversationHistory();
        const suggestion = SuggestionsEnabled ? await fetchSuggestion(currentDraft, history, apiState.writingTone, apiState.apiKey) : "";
        
        if (event.target.textContent.trim() === currentDraft) {
            currentSuggestion = suggestion;
            updateSuggestionDOM(event.target);
        }
    }, DEBOUNCE_TIME);
}

function handleKeydown(event) {
    if (event.key === 'Tab' && isSuggestionDisplayed && currentSuggestion) {
        event.preventDefault();
        const completionText = currentSuggestion.substring(currentDraft.length);
        document.execCommand('insertText', false, completionText);
        currentSuggestion = "";
        isSuggestionDisplayed = false;
        updateSuggestionDOM(event.target);
    }
}

function EditInputText(Text) {
    // 1. Select the main editable element itself, not the inner span
    const editor = document.querySelector('#main [role="textbox"]');

    // 2. Check if the editor was found
    if (editor) {
        // 3. Set focus on the editor
        editor.focus();
        // 4. Execute commands to replace the text
        document.execCommand('selectAll', false, null); // Selects all current text
        document.execCommand('insertText', false, Text); // Replaces the selection with "hello"
    } else {
        console.log("The editor element was not found!");
        setTimeout(() => EditInputText(Text), 1000); // Retry after 1 second
        return null;
    }
}

if(ChatInput.length>0){
    EditInputText(ChatInput);
    ChatInput="";
}

// --- MODIFIED: Button Injection Logic ---
function injectAiButton() {
    // This check is important to prevent adding multiple buttons.
    if (document.getElementById(AI_BUTTON_ID)) {
        return;
    }

    const micButton = document.querySelector(MIC_BUTTON_SELECTOR);
    if (!micButton) {
        // If the anchor isn't found, we just exit. The observer will call this function again on the next DOM change.
        return;
    }

    const buttonContainer = micButton.parentElement;
    if (!buttonContainer) {
        return;
    }
    
    console.log("Chat Catalyst: Injecting AI button...");

    const aiButton = document.createElement('button');
    aiButton.id = AI_BUTTON_ID;
    aiButton.className = micButton.className;
    aiButton.setAttribute('aria-label', 'Chat Catalyst AI');
    aiButton.innerHTML = `
        <span aria-hidden="true" data-icon="sparkles">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="geminiGradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#F3A37A"/>
                        <stop offset="0.25" stop-color="#F3D65A"/>
                        <stop offset="0.5" stop-color="#A5D6A7"/>
                        <stop offset="0.75" stop-color="#4C8BF5"/>
                        <stop offset="1" stop-color="#C58AF9"/>
                    </linearGradient>
                </defs>
                <path d="M12 0C10.5 5.5 5.5 10.5 0 12C5.5 13.5 10.5 18.5 12 24C13.5 18.5 18.5 13.5 24 12C18.5 10.5 13.5 5.5 12 0Z" fill="url(#geminiGradient)"/>
            </svg>
        </span>
    `;

    aiButton.addEventListener('click', async () => {
        console.log("Chat Catalyst AI button clicked!");
        const inputElement = document.querySelector(CHAT_INPUT_SELECTOR);
        if (!inputElement) {
            console.error("Rewrite Error: Could not find the chat input box.");
            return;
        }

        const textToRewrite = inputElement.textContent.trim();
        if (!textToRewrite) {
            console.log("Rewrite Info: Text box is empty. Nothing to rewrite.");
            return;
        }

        console.log(`Attempting to rewrite: "${textToRewrite}"`);
        inputElement.textContent = 'Rewriting...';

        try {
            const rewritten = await ReWriteSentence(textToRewrite, getConversationHistory(), apiState.writingTone, apiState.apiKey);

            if (rewritten && !rewritten.toLowerCase().includes("error")) {
                //inputElement.textContent = rewritten;
                console.log(`API response received: "${rewritten}"`);
                //EditInputText(rewritten);
                //ChatInput = rewritten;
                const editor = document.querySelector('#main [role="textbox"]');
                if (editor) {
                    editor.focus();
                    document.execCommand('selectAll', false, null);
                    document.execCommand('insertText', false, textToRewrite.split(" ")[0]); // Insert first word to retain cursor position
                    document.execCommand('selectAll', false, null);
                    document.execCommand('insertText', false, " " +rewritten.split(' ').slice(1).join(' ')); // Insert rest of the text
                }
            } else {
                console.error("Rewrite Error: API returned an error or empty response.");
                inputElement.textContent = textToRewrite;
            }
        } catch (error) {
            console.error("A critical error occurred during the rewrite API call:", error);
            inputElement.textContent = textToRewrite;
        }
    });
    
    // MODIFIED: This is the correct way to insert the button next to the mic button.
    buttonContainer.insertBefore(aiButton, micButton.parentElement);
}


// --- INITIALIZATION ---

// MODIFIED: The observer now handles both initializing the assistant AND injecting the button.
function initializeUI() {
    console.log("Chat Catalyst: Observer initialized. Watching for UI elements...");
    const observer = new MutationObserver((mutations, obs) => {
        // --- Part 1: Handle the text input field for suggestions ---
        const inputElement = document.querySelector(CHAT_INPUT_SELECTOR);
        if (inputElement && !inputElement.dataset.assistantInitialized) {
            console.log("Chat Catalyst: Input field found! Attaching listeners.");
            inputElement.addEventListener('input', handleInput);
            inputElement.addEventListener('keydown', handleKeydown, true);
            inputElement.dataset.assistantInitialized = 'true';

            if (!suggestionElement) {
                suggestionElement = createSuggestionElement();
            }
        }

        // --- Part 2: Handle injecting the AI rewrite button ---
        // We call injectAiButton on every DOM change. 
        // The function itself is smart enough not to add a second button if one already exists.
        injectAiButton();
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
});

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

// --- SCRIPT START ---
requestInitialSettings(); 
initializeUI(); // MODIFIED: Call the single, unified initializer.