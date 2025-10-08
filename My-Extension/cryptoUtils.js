// cryptoUtils.js

// Generate a random 12-byte IV for encryption
function generateIv() {
    return window.crypto.getRandomValues(new Uint8Array(12));
}

// Convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

// Use a fixed key derived from the extension ID for simplicity and consistency
async function getKey(keyMaterial) {
    // The key material must be 32 bytes for AES-256.
    const keyBytes = new TextEncoder().encode(keyMaterial.slice(0, 32));
    const key = await window.crypto.subtle.importKey(
        'raw',
        keyBytes, {
            name: 'AES-GCM'
        },
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
        // Note: chrome.runtime.id is guaranteed to be stable for an installed extension
        const keyMaterial = chrome.runtime.id;
        const key = await getKey(keyMaterial);
        const encoded = new TextEncoder().encode(text);

        const ciphertext = await window.crypto.subtle.encrypt({
                name: "AES-GCM",
                iv: iv
            },
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
            const keyMaterial = chrome.runtime.id;
            const key = await getKey(keyMaterial);
            const ivBuffer = base64ToArrayBuffer(iv);
            const ciphertextBuffer = base64ToArrayBuffer(ciphertext);

            const plaintext = await window.crypto.subtle.decrypt({
                    name: "AES-GCM",
                    iv: ivBuffer
                },
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

// EXPORT STATEMENTS: Required for popup.js to import the functions using ES Modules.
export const encrypt = cryptoUtils.encrypt;
export const decrypt = cryptoUtils.decrypt;
