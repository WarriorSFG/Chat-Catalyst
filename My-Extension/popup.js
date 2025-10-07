document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const toneSelect = document.getElementById('toneSelect');
    const saveButton = document.getElementById('saveButton');
    const saveButtonText = document.getElementById('saveButtonText');
    const statusMessage = document.getElementById('statusMessage');

    const MASKED_KEY_VALUE = '•••••••••••••••• (Saved)';

    // --- Utility Functions ---

    // Sets the status message with color and auto-hides it
    function showStatus(message, isSuccess = true) {
        statusMessage.textContent = message;
        statusMessage.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'border-red-300', 'bg-green-100', 'text-green-800', 'border-green-300');
        
        if (isSuccess) {
            statusMessage.classList.add('bg-green-100', 'text-green-800', 'border-green-300');
        } else {
            statusMessage.classList.add('bg-red-100', 'text-red-800', 'border-red-300');
        }

        setTimeout(() => statusMessage.classList.add('hidden'), 3000);
    }

    // --- Load and Save Logic ---

    // 1. Load existing settings when the popup opens
    chrome.storage.local.get(['geminiApiKey', 'writingTone'], (result) => {
        if (result.geminiApiKey) {
            // Mask the key on load, but mark it as saved
            apiKeyInput.value = MASKED_KEY_VALUE; 
            apiKeyInput.dataset.saved = 'true';
        } else {
            apiKeyInput.dataset.saved = 'false';
        }
        
        if (result.writingTone) {
            toneSelect.value = result.writingTone;
        }
    });

    // Handle input field focus/blur to manage the masked key
    apiKeyInput.addEventListener('focus', () => {
        if (apiKeyInput.value === MASKED_KEY_VALUE) {
            apiKeyInput.value = ''; // Clear the masked text when user clicks to edit
        }
        apiKeyInput.type = 'text'; // Temporarily show text when editing
    });

    apiKeyInput.addEventListener('blur', () => {
        if (apiKeyInput.dataset.saved === 'true' && apiKeyInput.value === '') {
            apiKeyInput.value = MASKED_KEY_VALUE; // Restore mask if key was saved and input is now empty
            apiKeyInput.type = 'password';
        }
    });


    // 2. Save settings when the button is clicked
    saveButton.addEventListener('click', () => {
        saveButtonText.textContent = 'Saving...';
        saveButton.disabled = true;

        let keyToSave = apiKeyInput.value;
        const settings = {};

        // Only save the key if it was actually changed by the user
        if (keyToSave !== MASKED_KEY_VALUE && keyToSave.trim() !== '') {
             // CRITICAL: The PS requires ENCRYPTED storage. You must add proper encryption here.
             // This stores the raw key. Replace this with a secure encryption function!
             settings.geminiApiKey = keyToSave.trim();
             apiKeyInput.dataset.saved = 'true';
        } else if (keyToSave.trim() === '' && apiKeyInput.dataset.saved === 'true') {
             // If user cleared the field but a key was previously saved, treat it as saving the current key
             // No need to save a blank key, rely on the stored one unless explicitly overwritten
        } else if (keyToSave.trim() === '' && apiKeyInput.dataset.saved === 'false') {
             // User explicitly cleared a non-saved/new key
             showStatus('API Key required for suggestions to work.', false);
             saveButtonText.textContent = 'Save Settings';
             saveButton.disabled = false;
             return;
        }

        settings.writingTone = toneSelect.value;
        
        chrome.storage.local.set(settings, () => {
            // Restore UI state
            saveButtonText.textContent = 'Save Settings';
            saveButton.disabled = false;
            
            // Re-mask the input field after successful save
            if (apiKeyInput.dataset.saved === 'true' && apiKeyInput.value !== MASKED_KEY_VALUE) {
                apiKeyInput.type = 'password';
                apiKeyInput.value = MASKED_KEY_VALUE;
            }

            showStatus('Settings saved successfully!');
            
            // Send message to the content script to update AI state immediately
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, { 
                        action: "settingsUpdated", 
                        tone: settings.writingTone // Send the tone directly
                    });
                }
            });
        });
    });
});
