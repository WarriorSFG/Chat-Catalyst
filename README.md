# ✦ Chat Catalyst

**AI-Powered Writing Assistant for WhatsApp Web**

🏆 *InterIIT Bootcamp · 3rd Place*

---

| **Manifest V3** | **Gemini 2.5 Flash** | **AES-GCM Encrypted** | **WhatsApp Web** |
|---|---|---|---|

## Overview

Chat Catalyst is a Chrome extension that brings real-time, context-aware AI writing assistance directly into WhatsApp Web. Powered by Google's Gemini 2.5 Flash model, it analyzes your ongoing conversation and helps you write better messages — faster.

Built for the InterIIT Bootcamp hackathon, the extension secured 3rd place among all competing teams. It is designed to feel completely native to WhatsApp, injecting seamlessly into the UI without disrupting the user's experience.

## Features

### Autocomplete

As you type, Chat Catalyst reads the last 10 messages of your conversation for context and predicts how your current sentence should end. A subtle ghost-text suggestion appears inline. Press Tab to instantly accept it — no clicks required.

### One-Click Rewrite

A sparkle button (✦) is injected next to the WhatsApp send button. Click it to instantly rewrite whatever you have typed into a cleaner, more polished version while preserving your original intent and chosen tone.

### Three Rewrite Variants

While typing, three alternative phrasings of your sentence appear as pill-shaped buttons above the input bar. Each variant is distinct — click any one to replace your draft instantly.

### Tone Customization

Choose your preferred writing tone from the extension popup. The selected tone is applied to all AI operations — autocomplete, rewrite, and variant suggestions.

| **Tone** | **Description** |
|---|---|
| 💼 Professional | Formal, polished language suitable for work messages. |
| 🎓 Academic | Structured, precise phrasing with careful word choice. |
| 💬 Casual | Relaxed, conversational, and friendly. |
| ❤️ Empathetic | Warm, thoughtful, and emotionally aware. |

### Encrypted API Key Storage

Your Gemini API key is never stored in plain text. It is encrypted using AES-GCM (via the Web Crypto API) before being saved to chrome.storage.local, and decrypted on demand by the extension's background service worker.

### Live Settings Sync

Changes made in the popup (API key or tone) are pushed to the active WhatsApp Web tab instantly via Chrome's message-passing API — no page refresh needed.

## Architecture

The extension is composed of four main modules, each responsible for a distinct concern:

| **File** | **Responsibility** |
|---|---|
| content.js | Injected into WhatsApp Web. Manages all UI injection (AI button, ghost-text, suggestion pills), listens to keystrokes, calls the Gemini API, and updates the DOM. |
| background.js | Service worker. Listens for messages from the content script requesting settings. Decrypts the API key from storage and returns it securely. |
| popup.js | Handles the settings UI. Encrypts and saves the API key; sends live updates to the active content script. |
| cryptoUtils.js | Reusable encryption/decryption module. Provides encrypt() and decrypt() functions backed by AES-GCM via the Web Crypto API. |

### Data Flow

- User opens WhatsApp Web → **content.js** sends **getInitialSettings** to **background.js**.
- **background.js** decrypts the stored API key and returns it, along with the saved tone.
- As the user types, **content.js** debounces input and calls the Gemini API directly for both autocomplete and rewrite variants simultaneously.
- The AI button triggers a single-shot rewrite via **ReWriteSentence()**
- When the user updates settings in the popup, **popup.js** re-encrypts the key, saves it, and sends a **settingsUpdated** message to the active tab.

## Installation

### Prerequisites

- Google Chrome (or a Chromium-based browser)
- A free Google Gemini API key from Google AI Studio

### Steps

1. Clone or download this repository:
   ```bash
   git clone https://github.com/your-username/chat-catalyst.git
   ```

2. Open Chrome and navigate to `chrome://extensions`

3. Enable "Developer mode" using the toggle in the top-right corner.

4. Click "Load unpacked" and select the project folder.

5. The Chat Catalyst icon will appear in your Chrome toolbar. Click it to open the settings popup.

6. Paste in your Gemini API key, choose your preferred tone, and click Save Settings.

7. Open or refresh WhatsApp Web (`https://web.whatsapp.com`). The extension is now active.

> **Note:** The extension requires the storage permission (declared in manifest.json) to save your settings locally. No data is sent to any server other than the Google Generative Language API.

## How to Use

### Autocomplete

- Open any WhatsApp chat and start typing a message.
- After a brief pause (~300ms), a grey ghost-text suggestion appears inline.
- Press Tab to accept the full suggestion, or keep typing to dismiss it.

### One-Click Rewrite (AI Button)

- Type a draft of your message in the chat input.
- Click the ✦ sparkle button next to the send icon.
- Your text is instantly replaced with a refined version in your selected tone.

### Three Rewrite Variants

- Type at least 5 characters in the input box.
- After the debounce delay, three pill-shaped suggestion buttons appear above the input bar.
- Click any pill to replace your current draft with that variant.

### Changing Settings

- Click the Chat Catalyst icon in the Chrome toolbar.
- Update your API key or tone preference.
- Click Save Settings. Changes take effect immediately in any open WhatsApp Web tab.

## Configuration

The following constants at the top of content.js can be adjusted for development:

```javascript
const DEBOUNCE_TIME = 300;        // ms to wait after typing stops before calling the API
const SuggestionsEnabled = true;  // set to false to disable autocomplete + variant suggestions
```

## Tech Stack

| **Technology** | **Usage** |
|---|---|
| Chrome Extensions Manifest V3 | Extension framework with service worker background script |
| Google Gemini 2.5 Flash | LLM powering autocomplete, rewrite, and variant generation |
| Web Crypto API (AES-GCM) | Client-side encryption of the API key before storage |
| chrome.storage.local | Persistent, sandboxed local storage for settings |
| MutationObserver | Detects WhatsApp's dynamic DOM changes to inject UI at the right time |
| ES Modules | Used in background.js and popup.js for clean imports (type: module) |

## Security Model

The extension makes a deliberate security decision: the Gemini API key is **never stored in plain text**. The full flow is:

1. User enters their key in the popup → **encrypt()** in **cryptoUtils.js** generates a random 12-byte IV and encrypts the key with AES-GCM.
2. The *ciphertext* and *IV* are saved separately in **chrome.storage.local**.
3. When settings are needed, the background service worker retrieves both, decrypts the key, and passes it to the requesting script.
4. The AES-GCM key is derived from the extension's unique runtime ID, which is consistent per installation.

> **Note:** This approach means that even if chrome.storage.local were somehow read by another party, the raw API key would not be exposed without also knowing the extension's runtime ID.

## Known Limitations & Future Work

### Current Limitations

- WhatsApp Web's DOM selectors may change with updates, requiring a selector update in content.js.
- The AES-GCM key derivation uses chrome.runtime.id, which resets if the extension is reinstalled — requiring the API key to be re-entered.
- Content scripts cannot use ES module imports directly; cryptoUtils.js is loaded via a workaround through the background service worker.
- The rewrite function uses document.execCommand (deprecated), which is currently the only reliable method for modifying WhatsApp's contenteditable input.

### Potential Improvements

- Add support for other messaging platforms (Telegram Web, Slack).
- Implement a conversation summarization feature for long chats.
- Allow custom tone definitions via a text field in the popup.
- Add a keyboard shortcut to trigger the rewrite without clicking the button.
- Migrate from document.execCommand to a more robust input injection strategy.

## Project Structure

```
chat-catalyst/
├── manifest.json       # Extension manifest (Manifest V3)
├── background.js       # Service worker: settings relay & decryption
├── content.js          # Main logic: UI injection & Gemini API calls
├── popup.html          # Settings popup HTML & CSS
├── popup.js            # Settings popup logic: save, load, encrypt
├── cryptoUtils.js      # Shared AES-GCM encryption/decryption utilities
└── icon.png            # Extension icon (48x48)
```

---

**Chat Catalyst · InterIIT Bootcamp · 3rd Place 🏆**

Built with ❤️ using Google Gemini 2.5 Flash & Chrome Extensions Manifest V3
