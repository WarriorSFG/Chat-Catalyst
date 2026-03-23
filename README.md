
#  Chat Catalyst
Real-time, context-aware AI writing assistance directly inside your chat box.

---

##  Overview
Chat Catalyst is a lightweight Chrome extension that delivers real-time, context-aware AI writing assistance directly inside your chat box. With a footprint of **under 1MB**, it integrates seamlessly into your workflow without compromising speed or performance.

It enables faster, clearer, and better-toned communication without interrupting your typing flow. Powered by the Gemini 2.5 Flash model, it provides near-instant text completions and intelligent rewrites while maintaining a secure, privacy-first experience.

---

##  The Problem
Users often struggle to compose messages that are clear, well-toned, and contextually appropriate. Existing AI tools require switching between apps, which breaks the natural chat flow.

Chat Catalyst solves this by providing fast, privacy-focused, inline assistance—right where you type.

---

##  Core Features

###  Ghost Text Autocomplete
Get real-time inline suggestions as you type—just press **Tab** to accept and continue writing seamlessly.

###  Live Rewrite Button
A visible, non-intrusive button inside the text box lets you instantly rewrite messages without interfering with platform UI (e.g., WhatsApp).

###  Dynamic Tone Control
Switch between **Professional, Academic, Casual, and Empathetic** tones without leaving the chat.

###  Context Awareness
Analyzes the last 10 messages in the conversation to generate relevant and contextually accurate suggestions.

---

##  Security & Architecture

###  Serverless Design
Fully client-side architecture with no central backend, ensuring scalability and zero server dependency.

###  Data Privacy
User data and API keys are never sent to third-party servers. All communication is a direct, secure HTTPS request to the official API.

###  Local Encryption
API keys are encrypted locally using **AES-GCM**, with a master key derived from the browser extension ID and a random 12-byte IV.

###  Cost Management
Implements input debouncing to minimize unnecessary API calls and reduce token usage.

---

##  Installation & Setup

1. Clone or download this repository  
2. Go to `chrome://extensions/`  
3. Enable **Developer Mode** (top right)  
4. Click **Load Unpacked** and select the project folder  
5. Get your API key from Google AI Studio  
6. Open settings → paste API key → Save  

---

##  Future Roadmap

-  **Platform Expansion**: Gmail, LinkedIn, Twitter, Google Docs  
-  **Advanced Caching**: Instant responses for repeated prompts  
-  **Cooldown System**: Prevent excessive API calls  

---
