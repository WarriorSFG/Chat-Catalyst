// popup.js

// --- IMPORT THE CRYPTO UTILITIES ---
// This now correctly points to the separate cryptoUtils.js file.
import {
    encrypt,
    decrypt
} from './cryptoUtils.js';

// Function to show a temporary status message in the popup UI
function showStatus(message, isSuccess = true) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';

    // Apply specific colors based on success or error (using the CSS defined in popup.html)
    if (isSuccess) {
        statusDiv.style.backgroundColor = '#ecfdf5'; // Light green background
        statusDiv.style.color = '#065f46'; // Dark green text
        statusDiv.style.borderColor = '#10B981'; // Emerald border
    } else {
        statusDiv.style.backgroundColor = '#fee2e2'; // Light red background
        statusDiv.style.color = '#991b1b'; // Dark red text
        statusDiv.style.borderColor = '#f87171'; // Red border
    }

    // Hide the message after 3 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

// Function to save settings to chrome.storage.local
function saveSettings() {
    const apiKey = document.getElementById('apiKey').value;
    const tone = document.getElementById('toneSelect').value;
    const saveButtonText = document.getElementById('saveButtonText');

    if (!apiKey) {
        showStatus('Error: API Key cannot be empty.', false);
        return;
    }

    // 1. Encrypt the API Key using the imported utility function
    encrypt(apiKey).then(({
        ciphertext,
        iv
    }) => {
        // 2. Store the encrypted API key (ciphertext), the IV, and the tone.
        chrome.storage.local.set({
            'geminiApiKey': ciphertext,
            'geminiApiKeyIV': iv,
            'writingTone': tone // Store tone separately (it doesn't need encryption)
        }, () => {
            // 3. Provide successful feedback
            showStatus('Settings Saved Successfully (Encrypted)!');

            // Temporarily change button text for extra feedback
            saveButtonText.textContent = 'Saved!';
            setTimeout(() => {
                saveButtonText.textContent = 'Save Settings';
            }, 1500);
        });
    }).catch(error => {
        console.error("Encryption failed:", error);
        showStatus('Error: Failed to encrypt key.', false);
    });
}

// Function to load settings from chrome.storage.local when the popup opens
function loadSettings() {
    // Look for the encrypted key parts and the tone
    chrome.storage.local.get(['geminiApiKey', 'geminiApiKeyIV', 'writingTone'], (items) => {

        // Load Tone first (if available)
        if (items.writingTone) {
            document.getElementById('toneSelect').value = items.writingTone;
        }

        // Check for encrypted API Key parts
        const ciphertext = items.geminiApiKey;
        const iv = items.geminiApiKeyIV;

        if (ciphertext && iv) {
            // 1. Decrypt the API Key
            decrypt(ciphertext, iv)
                .then(decryptedKey => {
                    if (decryptedKey) {
                        // 2. Display the decrypted key in the input field
                        document.getElementById('apiKey').value = decryptedKey;

                        // 3. Show success message
                        showStatus('Settings loaded and key decrypted.');
                    } else {
                        // Decryption failed 
                        showStatus('Error: Could not decrypt stored key.', false);
                    }
                })
                .catch(error => {
                    console.error("Error during decryption:", error);
                    showStatus('Error: Failed to retrieve stored key.', false);
                });
        } else {
            // Show a generic message if no settings are saved
            showStatus('Enter your Gemini API Key to get started.', true);
        }
    });
}

// Event Listeners:
// 1. Load settings when the popup DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    // 2. Save settings when the button is clicked
    document.getElementById('saveButton').addEventListener('click', saveSettings);
});
