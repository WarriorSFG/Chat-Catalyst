# Chat-Catalyst

Real-time, context-aware AI writing assistance directly inside your chat box.

Chat Catalyst is a lightweight Chrome extension that delivers real-time, context-aware AI writing assistance directly inside your chat box. With a footprint of under 1MB, it integrates seamlessly into your workflow without compromising speed or performance. It enables faster, clearer, and better-toned communication without interrupting your typing flow. Powered by the Gemini 2.5 Flash model, it provides near-instant text completions and intelligent rewrites while maintaining a secure, privacy-first experience.

 #The Problem
Users often face difficulty composing messages that are clear, well-toned, and contextually appropriate. Existing AI tools require switching between apps, which breaks the natural chat flow. Chat Catalyst bridges this gap by providing faster, privacy-focused, inline assistance while you type.

 #Core Features
 Ghost Text Autocomplete: Familiar to Gmail users, this feature provides inline suggestions as you type; simply press the "Tab" key to accept.

 Live Rewrite Button: A brightly colored button placed at the start of the text box provides easy visibility and avoids interference with WhatsApp's native buttons.

 Dynamic Tone Control: Seamlessly switch between 4 available tones—Professional, Academic, Casual, and Empathetic—without leaving the chat.


 Context Awareness: The extension reads the last 10 messages in the conversation to ensure suggestions make sense and fit the ongoing chat.

 #Security & Architecture
Serverless Design: The extension is 100% client-side, operating without a central backend to maintain or scale.


Data Privacy: User data and API keys are never transmitted to any third-party servers. All communication is a direct, secure HTTPS request to the official Google Gemini API.


Local Encryption: Your API key is encrypted locally using the AES-GCM algorithm. The master encryption key is securely derived from the unique browser extension ID, utilizing a random 12-byte IV to ensure uniqueness.


Cost Management: To reduce unnecessary token usage, the extension utilizes input debouncing—waiting for the user to stop typing before triggering an API call.


 #Installation & Setup
Download the Repository: Clone or download the Chat Catalyst source code to your local machine.

Open Chrome Extensions: Navigate to chrome://extensions/ in your Chrome browser.

Enable Developer Mode: Toggle the "Developer mode" switch in the top right corner.

Load Unpacked: Click "Load unpacked" and select the folder containing your extension files.

Get Your API Key: Go to Google AI Studio to get your API key.

Configure: Open the Chat Catalyst Settings panel, enter your API key, change your default tone, and hit save.


 #Future Roadmap
Platform Expansion: Extending the extension to support Gmail, LinkedIn, Twitter, and Google Docs by writing platform-specific content scripts.


Advanced Caching: Storing recent completions locally so repeated prompts are served instantly from the cache, further cutting token usage.

Cooldown Implementation: Adding a short cooldown window between API calls to prevent rapid-fire requests.
