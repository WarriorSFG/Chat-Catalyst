// buttonInjector.js

// --- CONFIGURATION ---
const MIC_BUTTON_SELECTOR = 'button[aria-label="Voice message"]';
const AI_BUTTON_ID = 'chat-catalyst-ai-button';

/**
 * Finds the microphone button's container and injects our custom AI button.
 * This function is designed to be re-run safely if the UI updates.
 */

function injectAiButton() {
    console.log("Attempting to inject Chat Catalyst AI button...");
    // Check if our button already exists to avoid duplicates
    if (document.getElementById(AI_BUTTON_ID)) {
        console.log("Chat Catalyst AI button already exists.");
        return;
    }

    // 1. Find the microphone button, which is our stable anchor
    const micButton = document.querySelector(MIC_BUTTON_SELECTOR);
    if (!micButton) {
        console.log("Microphone button not found."); // If the mic button isn't on the page yet, do nothing.
        setTimeout(injectAiButton, 5000); // Retry after 5 seconds
        return;
    }

    // 2. Find its direct parent container. This is where we'll insert our button.
    const buttonContainer = micButton.parentElement;
    if (!buttonContainer) {
        console.log("Button container not found."); // If the container isn't found, do nothing.
        setTimeout(injectAiButton, 5000); // Retry after 5 seconds
        return;
    }

    // 3. Create our new button
    const aiButton = document.createElement('button');
    aiButton.id = AI_BUTTON_ID;
    
    // 4. Copy the classes from the mic button to make ours look identical
    aiButton.className = micButton.className;
    aiButton.setAttribute('aria-label', 'Chat Catalyst AI');
    
    // 5. Create a "magic wand" SVG icon for our button
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

    // 6. Add a click event listener
    aiButton.addEventListener('click', () => {
        console.log("Chat Catalyst AI button clicked!");
        // Future AI actions can be triggered from here
    });

    // 7. Insert our new button into the DOM, right before the mic button's container
    buttonContainer.parentNode.insertBefore(aiButton, buttonContainer);
}

injectAiButton();
