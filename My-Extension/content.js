// --- CONFIGURATION ---
const DEBOUNCE_TIME = 500; // Time in ms before triggering AI suggestion
const CHAT_INPUT_SELECTOR = '[data-testid="conversation-panel-messages"] ~ div div[contenteditable="true"]'; // Target the input field
const CHAT_MESSAGE_SELECTOR = '[data-testid="conversation-panel"] [data-testid="incoming-message"], [data-testid="conversation-panel"] [data-testid="outgoing-message"]'; // Target chat messages
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

let typingTimer;
let currentDraft = "";
let currentSuggestion = "";
let suggestionElement = null; // Element to hold the ghost text
let isSuggestionDisplayed = false;
let apiState = {
    apiKey: null,
    writingTone: 'professional'
};

// --- API CALL LOGIC ---

/**
 * Parses the visible chat messages to create a context history for the AI.
 * IMPORTANT: This selector is a simplified guess. You must inspect the actual WhatsApp Web DOM 
 * to find the correct, robust selectors for messages and text content.
 */
function getConversationHistory() {
    const messages = document.querySelectorAll(CHAT_MESSAGE_SELECTOR);
    const history = [];

    messages.forEach(msgDiv => {
        // WhatsApp messages often use spans inside data-testid divs.
        const textElement = msgDiv.querySelector('.selectable-text span') || msgDiv;
        const text = textElement.textContent.trim();

        if (text) {
            // Determine role based on data-testid or class names (check the DOM!)
            const role = msgDiv.getAttribute('data-testid') === 'outgoing-message' ? 'YOU' : 'THEM';
            history.push({ role, text });
        }
    });

    // Limit history to the last 10 messages for performance and context relevance
    return history.slice(-10); 
}

/**
 * Fetches AI suggestion using the Gemini API.
 */
async function fetchSuggestion(draft, history, tone, apiKey) {
    if (!apiKey) {
        return "ERROR: API Key not set. Open extension popup to configure.";
    }

    const contextText = history.map(msg => `${msg.role}: ${msg.text}`).join('\n');
    
    // --- System Prompt for Context-Aware Tone Adaptation (Key PS Requirement) ---
    const systemPrompt = `You are a real-time, context-aware writing assistant for a messaging application.
    The user is drafting a response with the desired tone: '${tone}'.
    Analyze the context and the user's draft to provide a short, single-sentence completion or polite rephrase. 
    Do not use markdown, lists, or introductory phrases. ONLY provide the suggested text.
    
    Context: 
    ---
    ${contextText}
    ---
    Draft: "${draft}"`;

    const payload = {
        contents: [{ parts: [{ text: "Complete or rephrase the draft based on the context." }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        // NOTE: Google Search grounding is typically not required for chat completions, 
        // but can be added if the context is highly specific or involves current events.
        // tools: [{ "google_search": {} }], 
    };

    try {
        const response = await fetch(GEMINI_API_URL + `?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} - ${await response.text()}`);
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "No suggestion found.";
        return text.trim();

    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Error fetching suggestion.";
    }
}

// --- DOM MANIPULATION (GHOST TEXT) ---

function createSuggestionElement(inputElement) {
    // We create an invisible element styled like the input to hold the ghost text
    const parent = inputElement.parentElement;
    
    // Create a wrapper to manage positioning of the ghost text and the input itself
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    
    // Move the input field into the wrapper
    parent.insertBefore(wrapper, inputElement);
    wrapper.appendChild(inputElement);

    const ghost = document.createElement('div');
    ghost.style.position = 'absolute';
    ghost.style.top = '0';
    ghost.style.left = '0';
    ghost.style.whiteSpace = 'pre'; // Important for aligning text!
    ghost.style.color = '#B0B0B0'; // Light gray color for ghost text
    ghost.style.pointerEvents = 'none'; // Essential so mouse events pass through to input
    ghost.style.padding = inputElement.style.padding;
    ghost.style.fontSize = window.getComputedStyle(inputElement).fontSize;
    ghost.style.lineHeight = window.getComputedStyle(inputElement).lineHeight;
    ghost.style.zIndex = '1';
    ghost.id = 'chat-catalyst-ghost';
    
    // Insert the ghost element next to the input
    wrapper.insertBefore(ghost, inputElement.nextSibling);

    // Make sure the input element has a higher z-index so text input overlay works
    inputElement.style.position = 'relative';
    inputElement.style.zIndex = '2';
    inputElement.style.backgroundColor = 'transparent'; // May need to adjust transparency
    
    return ghost;
}

function updateSuggestionDOM(inputElement) {
    if (!suggestionElement) {
        suggestionElement = createSuggestionElement(inputElement);
    }
    
    const suggestionText = currentSuggestion.startsWith(currentDraft) ? currentSuggestion.substring(currentDraft.length) : currentSuggestion;
    
    if (currentDraft && suggestionText) {
        // Create the prefix (the user's text) and the suffix (the ghost suggestion)
        // The prefix needs to be the same color as the input text
        suggestionElement.innerHTML = `<span style="color: transparent;">${currentDraft}</span>${suggestionText}`;
        isSuggestionDisplayed = true;
    } else {
        suggestionElement.textContent = "";
        isSuggestionDisplayed = false;
    }
}


// --- MAIN EVENT HANDLERS ---

/**
 * Handles user input and debounces the AI call.
 */
function handleInput(event) {
    currentDraft = event.target.textContent.trim();
    clearTimeout(typingTimer);
    
    if (currentDraft.length < 3) {
        // Clear suggestion if draft is too short
        currentSuggestion = "";
        updateSuggestionDOM(event.target);
        return;
    }

    // Start a timer to call the AI after the user pauses typing
    typingTimer = setTimeout(async () => {
        currentSuggestion = "Loading..."; // Show loading state
        updateSuggestionDOM(event.target);
        
        const history = getConversationHistory();
        const suggestion = await fetchSuggestion(currentDraft, history, apiState.writingTone, apiState.apiKey);
        
        // Only update if the user hasn't typed something new while waiting
        if (event.target.textContent.trim() === currentDraft) {
            currentSuggestion = suggestion;
            updateSuggestionDOM(event.target);
        }
    }, DEBOUNCE_TIME);
}

/**
 * Handles Tab key to accept the suggestion. (Key PS Requirement)
 */
function handleKeydown(event) {
    // Check for Tab key and if a suggestion is currently displayed
    if (event.key === 'Tab' && isSuggestionDisplayed && currentSuggestion) {
        event.preventDefault(); // Stop the tab key from moving focus

        let textToInsert = currentSuggestion;
        
        // If the suggestion starts with the draft, only insert the completion part
        if (textToInsert.startsWith(currentDraft)) {
             textToInsert = textToInsert.substring(currentDraft.length);
        }

        const inputElement = event.target;
        // Use document.execCommand for contenteditable divs
        document.execCommand('insertText', false, textToInsert);
        
        currentDraft = inputElement.textContent.trim();
        currentSuggestion = "";
        updateSuggestionDOM(inputElement); // Clear the ghost text
    }
}

/**
 * Initializes the AI assistant by attaching event listeners to the chat input field.
 */
function initializeAssistant() {
    // Listen for the input field to appear in the DOM (crucial for single-page apps like WhatsApp)
    const observer = new MutationObserver((mutations, obs) => {
        const inputElement = document.querySelector(CHAT_INPUT_SELECTOR);
        if (inputElement && !inputElement.dataset.assistantInitialized) {
            
            // 1. Attach event listeners
            inputElement.addEventListener('input', handleInput);
            inputElement.addEventListener('keydown', handleKeydown);
            
            // 2. Mark as initialized to prevent double-binding
            inputElement.dataset.assistantInitialized = 'true';
            
            // 3. Create the suggestion element
            suggestionElement = createSuggestionElement(inputElement);
            
            console.log("Chat Catalyst AI Assistant Initialized on Input.");
        }
    });

    // Start observing the main conversation panel for when a chat is opened
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// --- INITIALIZATION AND SETTINGS HANDLING ---

// 1. Load settings on start
chrome.storage.local.get(['geminiApiKey', 'writingTone'], (result) => {
    apiState.apiKey = result.geminiApiKey || null;
    apiState.writingTone = result.writingTone || 'professional';
    console.log(`Chat Catalyst loaded settings. Tone: ${apiState.writingTone}`);
});

// 2. Listen for setting updates from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "settingsUpdated") {
        // Force reload settings to pick up new key/tone
        chrome.storage.local.get(['geminiApiKey', 'writingTone'], (result) => {
            apiState.apiKey = result.geminiApiKey;
            apiState.writingTone = request.tone;
            console.log(`Chat Catalyst updated tone to: ${apiState.writingTone}`);
        });
    }
});

// 3. Start the initialization process
initializeAssistant();
