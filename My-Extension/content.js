// content.js

// --- CONFIGURATION ---
const DEBOUNCE_TIME = 300; // Time in ms before triggering AI suggestion
const CHAT_INPUT_SELECTOR = '#main div[role="textbox"][contenteditable="true"]';
const CHAT_FOOTER_SELECTOR = '#main > footer';
const CHAT_MESSAGE_SELECTOR = 'div.message-in, div.message-out';
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";
const MIC_BUTTON_SELECTOR = '[aria-label="Send"]';
const AI_BUTTON_ID = 'chat-catalyst-ai-button';
const SuggestionsEnabled = true;

// --- SVG CONSTANTS (Unchanged) ---
const INITIAL_SPARKLES_SVG = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="geminiGradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop stop-color="#F3A37A"/> <stop offset="0.25" stop-color="#F3D65A"/>
                <stop offset="0.5" stop-color="#A5D6A7"/> <stop offset="0.75" stop-color="#4C8BF5"/>
                <stop offset="1" stop-color="#C58AF9"/>
            </linearGradient>
        </defs>
        <path d="M12 0C10.5 5.5 5.5 10.5 0 12C5.5 13.5 10.5 18.5 12 24C13.5 18.5 18.5 13.5 24 12C18.5 10.5 13.5 5.5 12 0Z" fill="url(#geminiGradient)"/>
    </svg>`;
const LOADING_SPARKLES_SVG = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2.99902C16.9706 2.99902 21 7.02846 21 11.999C21 16.9696 16.9706 20.999 12 20.999C7.02944 20.999 3 16.9696 3 11.999C3 7.02846 7.02944 2.99902 12 2.99902ZM12 1.49902C6.20101 1.49902 1.5 6.20003 1.5 11.999C1.5 17.798 6.20101 22.499 12 22.499C17.799 22.499 22.5 17.798 22.5 11.999C22.5 6.20003 17.799 1.49902 12 1.49902Z" fill="#8696a0" fill-opacity="0.3"/>
        <path d="M12 1.49902C11.6953 1.49902 11.4116 1.65825 11.2588 1.91402C6.91899 9.04018 7.37341 17.632 12.9304 22.1009C13.2081 22.321 13.5855 22.3486 13.8906 22.1695C14.1957 21.9904 14.3759 21.6596 14.3759 21.3059C14.3759 10.3289 12 1.49902 12 1.49902Z" fill="url(#geminiGradient)"/>
    </svg>`;

// --- STATE VARIABLES ---
let typingTimer;
let currentDraft = "";
let currentSuggestion = "";
let suggestionElement = null;
let rewriteSuggestionsContainer = null;
let suggestionLoading = false;
let isSuggestionDisplayed = false;
let apiState = {
    apiKey: null,
    writingTone: 'professional'
};

// --- API FUNCTIONS ---
async function fetchSuggestion(draft, history, tone, apiKey) {
    if (!apiKey) return "ERROR: API Key not set.";
    const contextText = history.map(msg => `${msg.role}: ${msg.text}`).join('\n');
    const systemPrompt = `You are an autocomplete writing assistant. Your one and only job is to complete the user's current sentence.
- Analyze the conversation history for context.
- The user's desired tone is '${tone}'.
- CRITICAL RULE: Your response MUST start with the user's exact draft text.
- DO NOT rephrase the user's text. Only complete it.
- Provide ONLY the final, completed sentence and nothing else.
Context:
---
${contextText}
---
User's Draft: "${draft}"`;
    const payload = {
        contents: [{ parts: [{ text: "Complete the draft." }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };
    try {
        const response = await fetch(GEMINI_API_URL + `?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    } catch (error) {
        console.error("Gemini Autocomplete Error:", error);
        return "Error fetching suggestion.";
    }
}

async function fetchRewriteSuggestions(draft, history, tone, apiKey) {
    if (!apiKey) return [];
    const contextText = history.map(msg => `${msg.role}: ${msg.text}`).join('\n');
    const systemPrompt = `You are a rewriting assistant. Rewrite the user's sentence in three distinct, improved ways, maintaining a '${tone}' tone.
- The first word of your response MUST be the first word of the user's original text.
- CRITICAL: Provide exactly three versions.
- CRITICAL: Separate each version with the unique delimiter "|||".
- DO NOT number the list or add any other text.
- Your suggestions should be concise and ready to use in a chat.
Context:
---
${contextText}
---
User's sentence: "${draft}"`;
    const payload = {
        contents: [{ parts: [{ text: "Rewrite the sentence in three ways." }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };
    try {
        const response = await fetch(GEMINI_API_URL + `?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const result = await response.json();
        const suggestionText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (suggestionText && suggestionText.includes("|||")) {
            return suggestionText.split('|||').map(s => s.trim()).filter(Boolean);
        }
        return suggestionText ? [suggestionText] : [];
    } catch (error) {
        console.error("Gemini Rewrite Error:", error);
        return [];
    }
}

async function ReWriteSentence(draft, history, tone, apiKey) {
    if (!apiKey) return "ERROR: API Key not set.";
    const contextText = history.map(msg => `${msg.role}: ${msg.text}`).join('\n');
    const systemPrompt = `You are a rewriting assistant. Your one and only job is to rewrite the user's current sentence in a more refined, structured and grammatically correct way in the '${tone}' tone.
- The first word of your response MUST be the first word of the user's original text.
- Rephrase the user's text. Complete it if needed.
- Provide ONLY the final, rewritten sentence and nothing else.
Context:
---
${contextText}
---
User's sentence: "${draft}"`;
    const payload = {
        contents: [{ parts: [{ text: "Rewrite the sentence." }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };
    try {
        const response = await fetch(GEMINI_API_URL + `?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Error fetching suggestion.";
    }
}

function getConversationHistory() {
    const messages = Array.from(document.querySelectorAll(CHAT_MESSAGE_SELECTOR));
    const history = [];
    messages.slice(-10).forEach(msgDiv => {
        const textElement = msgDiv.querySelector('.selectable-text span');
        const text = textElement ? textElement.textContent.trim() : '';
        if (text) {
            const role = msgDiv.classList.contains('message-out') ? 'YOU' : 'THEM';
            history.push({ role, text });
        }
    });
    return history;
}

// --- STYLES ---
function ensureStyles() {
    if (document.getElementById('chat-catalyst-styles')) return;
    const style = document.createElement('style');
    style.id = 'chat-catalyst-styles';
    style.textContent = `
        @keyframes cc-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .cc-spinner-active svg { animation: cc-rotate 1s linear infinite; }
        @keyframes cc-wave { 0%, 60%, 100% { transform: initial; } 30% { transform: translateY(-6px); } }
        .cc-ellipsis { display: inline-block; }
        .cc-dot { display: inline-block; width: 4px; height: 4px; margin: 0 1px; border-radius: 50%; background: currentColor; opacity: 0.6; }
        .cc-loading .cc-dot { animation: cc-wave 1.3s ease-in-out infinite; }
        .cc-loading .cc-dot:nth-child(2) { animation-delay: -1.1s; }
        .cc-loading .cc-dot:nth-child(3) { animation-delay: -0.9s; }
        #cc-rewrite-container { display: none; justify-content: center; align-items: center; gap: 8px; padding: 0 10px 8px 10px; flex-wrap: wrap; }
        .cc-rewrite-suggestion-btn { background-color: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #e0e0e0; padding: 6px 12px; border-radius: 18px; cursor: pointer; font-size: 13px; font-family: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 30%; transition: background-color 0.2s ease, transform 0.1s ease; }
        .cc-rewrite-suggestion-btn:hover { background-color: rgba(255, 255, 255, 0.2); }
        .cc-rewrite-suggestion-btn:active { transform: scale(0.95); }
    `;
    document.head.appendChild(style);
}

// --- DOM MANIPULATION ---
function repositionSuggestionElement(inputElement) {
    if (!suggestionElement) return;
    const inputRect = inputElement.getBoundingClientRect();
    const inputStyle = window.getComputedStyle(inputElement);
    Object.assign(suggestionElement.style, { position: 'fixed', top: `${inputRect.top}px`, left: `${inputRect.left}px`, width: `${inputRect.width}px`, height: `${inputRect.height}px`, padding: inputStyle.padding, font: inputStyle.font, lineHeight: inputStyle.lineHeight, visibility: 'visible' });
}

function createSuggestionElement() {
    let ghost = document.getElementById('chat-catalyst-ghost');
    if (ghost) ghost.remove();
    ghost = document.createElement('div');
    ghost.id = 'chat-catalyst-ghost';
    Object.assign(ghost.style, { color: '#B0B0B0', pointerEvents: 'none', zIndex: '9999', whiteSpace: 'pre-wrap', wordBreak: 'break-word' });
    document.body.appendChild(ghost);
    return ghost;
}

function updateSuggestionDOM(inputElement) {
    if (!suggestionElement) return;
    repositionSuggestionElement(inputElement);
    const isError = currentSuggestion.toLowerCase().includes("error");
    const isCompletion = currentSuggestion.toLowerCase().startsWith(currentDraft.toLowerCase());
    const shouldDisplay = currentDraft && currentSuggestion && !isError && isCompletion;
    if (shouldDisplay) {
        const completionText = currentSuggestion.substring(currentDraft.length);
        suggestionElement.innerHTML = `<span style="color: transparent;">${currentDraft}</span><span style="opacity: 0.6;">${completionText}</span>`;
        isSuggestionDisplayed = true;
        suggestionElement.classList.remove('cc-loading');
    } else {
        suggestionElement.textContent = "";
        isSuggestionDisplayed = false;
        if (currentDraft && suggestionLoading) {
            suggestionElement.innerHTML = `<span style="color: transparent;">${currentDraft}</span><span class="cc-ellipsis"><span class="cc-dot"></span><span class="cc-dot"></span><span class="cc-dot"></span></span>`;
            suggestionElement.classList.add('cc-loading');
        } else {
            suggestionElement.classList.remove('cc-loading');
        }
    }
}

function ensureRewriteContainer() {
    if (document.getElementById('cc-rewrite-container')) {
        rewriteSuggestionsContainer = document.getElementById('cc-rewrite-container');
        return;
    }
    const footer = document.querySelector(CHAT_FOOTER_SELECTOR);
    if (footer) {
        const container = document.createElement('div');
        container.id = 'cc-rewrite-container';
        footer.prepend(container);
        rewriteSuggestionsContainer = container;
        console.log("Chat Catalyst: Rewrite suggestions container injected.");
    }
}

function updateRewriteSuggestionsDOM(suggestions) {
    if (!rewriteSuggestionsContainer) return;
    rewriteSuggestionsContainer.innerHTML = '';
    if (suggestions && suggestions.length > 0) {
        suggestions.forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'cc-rewrite-suggestion-btn';
            btn.textContent = text;
            btn.addEventListener('click', () => {
                // --- MODIFIED: Use new logic ---
                rewriteAndPreserveFirstWord(currentDraft, text);
                clearRewriteSuggestionsDOM();
            });
            rewriteSuggestionsContainer.appendChild(btn);
        });
        rewriteSuggestionsContainer.style.display = 'flex';
    } else {
        rewriteSuggestionsContainer.style.display = 'none';
    }
}

function clearRewriteSuggestionsDOM() {
    if (rewriteSuggestionsContainer) {
        rewriteSuggestionsContainer.innerHTML = '';
        rewriteSuggestionsContainer.style.display = 'none';
    }
}

// --- NEW/MODIFIED: Text insertion logic ---
function EditInputText(text) {
    const editor = document.querySelector(CHAT_INPUT_SELECTOR);
    if (editor) {
        editor.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, text);
    } else {
        console.error("The editor element was not found!");
    }
}

function rewriteAndPreserveFirstWord(originalText, rewrittenText) {
    if (!originalText.trim() || !rewrittenText.trim()) {
        EditInputText(rewrittenText); // Fallback to original behavior
        return;
    }

    const editor = document.querySelector('#main [role="textbox"]');
                if (editor) {
                    editor.focus();
                    document.execCommand('selectAll', false, null);
                    document.execCommand('insertText', false, originalText.split(" ")[0]); // Insert first word to retain cursor position
                    document.execCommand('selectAll', false, null);
                    document.execCommand('insertText', false, " " +rewrittenText.split(' ').slice(1).join(' ')); // Insert rest of the text

                }
}

// --- EVENT HANDLERS ---
function handleInput(event) {
    currentDraft = event.target.textContent.trim();
    clearTimeout(typingTimer);
    updateSuggestionDOM(event.target);

    if (currentDraft.length < 5) {
        clearRewriteSuggestionsDOM();
        return;
    }

    suggestionLoading = true;
    updateSuggestionDOM(event.target);

    typingTimer = setTimeout(async () => {
        const history = getConversationHistory();
        const [completion, rewrites] = await Promise.all([
            SuggestionsEnabled ? fetchSuggestion(currentDraft, history, apiState.writingTone, apiState.apiKey) : "",
            SuggestionsEnabled ? fetchRewriteSuggestions(currentDraft, history, apiState.writingTone, apiState.apiKey) : []
        ]);
        suggestionLoading = false;

        if (event.target.textContent.trim() === currentDraft) {
            currentSuggestion = completion;
            updateSuggestionDOM(event.target);
            updateRewriteSuggestionsDOM(rewrites);
        } else {
            clearRewriteSuggestionsDOM();
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
        suggestionLoading = false;
        updateSuggestionDOM(event.target);
        clearRewriteSuggestionsDOM();
    }

    if (event.key === 'Backspace') {
        currentSuggestion = "";
        isSuggestionDisplayed = false;
        suggestionLoading = false;
        updateSuggestionDOM(event.target);
        if (event.target.textContent.trim().length <= 1) {
            clearRewriteSuggestionsDOM();
        }
    }
}

function injectAiButton() {
    if (document.getElementById(AI_BUTTON_ID)) return;
    const micButton = document.querySelector(MIC_BUTTON_SELECTOR);
    if (!micButton) return;
    const buttonContainer = micButton.parentElement.parentElement;
    if (!buttonContainer) return;

    console.log("Chat Catalyst: Injecting AI button...");
    const aiButton = document.createElement('button');
    aiButton.id = AI_BUTTON_ID;
    aiButton.setAttribute('aria-label', 'Chat Catalyst AI');
    aiButton.innerHTML = `<span aria-hidden="true">${INITIAL_SPARKLES_SVG}</span>`;
    aiButton.style.cursor = 'pointer';

    aiButton.addEventListener('click', async () => {
        const inputElement = document.querySelector(CHAT_INPUT_SELECTOR);
        if (!inputElement) return;
        const textToRewrite = inputElement.textContent.trim();
        if (!textToRewrite) return;
        
        clearTimeout(typingTimer);
        currentSuggestion = "";
        isSuggestionDisplayed = false;
        suggestionLoading = false;
        if (suggestionElement) suggestionElement.textContent = "";
        clearRewriteSuggestionsDOM();

        const svgContainer = aiButton.querySelector('span');
        svgContainer.innerHTML = LOADING_SPARKLES_SVG;
        aiButton.classList.add('cc-spinner-active');

        try {
            const rewritten = await ReWriteSentence(textToRewrite, getConversationHistory(), apiState.writingTone, apiState.apiKey);
            if (rewritten && !rewritten.toLowerCase().includes("error")) {
                // --- MODIFIED: Use new logic ---
                rewriteAndPreserveFirstWord(textToRewrite, rewritten);
            } else {
                console.error("Rewrite Error: API returned an error or empty response.");
            }
        } catch (error) {
            console.error("A critical error occurred during the rewrite API call:", error);
        } finally {
            svgContainer.innerHTML = INITIAL_SPARKLES_SVG;
            aiButton.classList.remove('cc-spinner-active');
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    const parent = buttonContainer.parentElement.parentElement.parentElement;
    if (parent) {
        parent.insertBefore(aiButton, parent.lastElementChild);
    }
}

// --- INITIALIZATION ---
function initializeUI() {
    console.log("Chat Catalyst: Observer initialized. Watching for UI elements...");
    ensureStyles();
    const observer = new MutationObserver(() => {
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
        if (!rewriteSuggestionsContainer) {
            ensureRewriteContainer();
        }
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
    console.log("Chat Catalyst: Requesting initial settings...");
    chrome.runtime.sendMessage({ action: "getInitialSettings" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Chat Catalyst: Could not get settings.", chrome.runtime.lastError);
            return;
        }
        if (response && response.apiKey) {
            apiState.apiKey = response.apiKey;
            apiState.writingTone = response.tone;
            console.log(`Chat Catalyst: Settings LOADED. Tone is -> ${apiState.writingTone}`);
        } else {
            console.log("Chat Catalyst: No API key found in storage.");
        }
    });
}

// --- SCRIPT START ---
requestInitialSettings();
initializeUI();