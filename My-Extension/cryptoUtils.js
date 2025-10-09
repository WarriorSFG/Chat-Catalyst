// cryptoUtils.js

// Generate a random 12-byte IV for encryption
function generateIv() {
    // REMOVED 'window.' prefix to work in service workers
    return crypto.getRandomValues(new Uint8Array(12));
}

// Convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    // REMOVED 'window.' prefix
    return btoa(binary);
}

// Convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64) {
    // REMOVED 'window.' prefix
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

// Use a fixed key derived from the extension ID for simplicity and consistency
async function getKey(keyMaterial) {
    const keyBytes = new TextEncoder().encode(keyMaterial);
    // REMOVED 'window.' prefix
    const key = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
    return key;
}

// The core encryption/decryption object
const cryptoUtils = {
    // Encrypts text and returns ciphertext and IV
    encrypt: async (text) => {
        const iv = generateIv();
        // Use extension ID for a stable key source
        const keyMaterial = chrome.runtime.id.substring(0, 32);
        const key = await getKey(keyMaterial);
        const encoded = new TextEncoder().encode(text);
        
        // REMOVED 'window.' prefix
        const ciphertext = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encoded
        );

        return {
            ciphertext: arrayBufferToBase64(ciphertext),
            iv: arrayBufferToBase64(iv)
        };
    },

    // Decrypts ciphertext using IV
    decrypt: async (ciphertext, iv) => {
        try {
            const keyMaterial = chrome.runtime.id.substring(0, 32);
            const key = await getKey(keyMaterial);
            const ivBuffer = base64ToArrayBuffer(iv);
            const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
            
            // REMOVED 'window.' prefix
            const plaintext = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: ivBuffer },
                key,
                ciphertextBuffer
            );
            return new TextDecoder().decode(plaintext);
        } catch (e) {
            console.error("Decryption failed:", e);
            return null;
        }
    }
}

export const encrypt = cryptoUtils.encrypt;
export const decrypt = cryptoUtils.decrypt;

