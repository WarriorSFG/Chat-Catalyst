// popup.js

// --- IMPORT THE CRYPTO UTILITIES ---
import {
    encrypt,
    decrypt
} from './cryptoUtils.js';

// Function to show a temporary status message in the popup UI
function showStatus(message, isSuccess = true) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';

    if (isSuccess) {
        statusDiv.style.backgroundColor = '#ecfdf5';
        statusDiv.style.color = '#065f46';
        statusDiv.style.borderColor = '#10B981';
    } else {
        statusDiv.style.backgroundColor = '#fee2e2';
        statusDiv.style.color = '#991b1b';
        statusDiv.style.borderColor = '#f87171';
    }

    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

// Function to send settings to the active content script
function sendSettingsToContentScript(apiKey, tone) {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "settingsUpdated",
                apiKey: apiKey, // Send the DECRYPTED key
                tone: tone
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log("Could not establish connection. The content script might not be injected yet.");
                } else {
                    console.log("Settings sent to content script:", response);
                }
            });
        }
    });
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

    // 1. Encrypt the API Key for storage
    encrypt(apiKey).then(({
        ciphertext,
        iv
    }) => {
        // 2. Store the encrypted data
        chrome.storage.local.set({
            'geminiApiKey': ciphertext,
            'geminiApiKeyIV': iv,
            'writingTone': tone
        }, () => {
            // 3. Send the DECRYPTED key and tone to the content script
            sendSettingsToContentScript(apiKey, tone);

            // 4. Provide successful feedback
            showStatus('Settings Saved Successfully (Encrypted)!');
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
    chrome.storage.local.get(['geminiApiKey', 'geminiApiKeyIV', 'writingTone'], (items) => {
        if (items.writingTone) {
            document.getElementById('toneSelect').value = items.writingTone;
        }

        const ciphertext = items.geminiApiKey;
        const iv = items.geminiApiKeyIV;

        if (ciphertext && iv) {
            // 1. Decrypt the API Key to display it and send it
            decrypt(ciphertext, iv)
                .then(decryptedKey => {
                    if (decryptedKey) {
                        document.getElementById('apiKey').value = decryptedKey;
                        showStatus('Settings loaded and key decrypted.');
                        // Also send settings to content script on load
                        sendSettingsToContentScript(decryptedKey, items.writingTone || 'professional');
                    } else {
                        showStatus('Error: Could not decrypt stored key.', false);
                    }
                })
                .catch(error => {
                    console.error("Error during decryption:", error);
                    showStatus('Error: Failed to retrieve stored key.', false);
                });
        } else {
            showStatus('Enter your Gemini API Key to get started.', true);
        }
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    document.getElementById('saveButton').addEventListener('click', saveSettings);
});

