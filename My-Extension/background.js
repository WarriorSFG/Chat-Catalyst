// background.js

import { decrypt } from './cryptoUtils.js';

// MODIFIED: This listener now handles a more generic settings request.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check for the new action from content.js
    if (request.action === "getInitialSettings") {
        // Get the encrypted key, IV, AND the writing tone from storage.
        chrome.storage.local.get(['geminiApiKey', 'geminiApiKeyIV', 'writingTone'], (items) => {
            const ciphertext = items.geminiApiKey;
            const iv = items.geminiApiKeyIV;
            const tone = items.writingTone || 'professional'; // Default tone

            if (ciphertext && iv) {
                // Decrypt the key
                decrypt(ciphertext, iv).then(decryptedKey => {
                    // Send back BOTH the decrypted key and the tone
                    sendResponse({ apiKey: decryptedKey, tone: tone });
                }).catch(error => {
                    console.error("Background decryption failed:", error);
                    sendResponse({ apiKey: null, tone: tone });
                });
            } else {
                // If no key is stored, send back null for the key.
                sendResponse({ apiKey: null, tone: tone });
            }
        });
        // Return true to indicate an asynchronous response.
        return true;
    }
});