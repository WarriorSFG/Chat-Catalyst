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
    
    // NOTE: The Problem Statement requires the key to be encrypted before storing. 
    // For this prototype, we store it as plain text. Implement AES/RSA encryption here for final submission.

    chrome.storage.local.set({
        'geminiApiKey': apiKey,
        'writingTone': tone
    }, () => {
        // Notify the user that settings have been saved
        showStatus('Settings Saved Successfully!');
        
        // Temporarily change button text for extra feedback
        saveButtonText.textContent = 'Saved!';
        setTimeout(() => {
            saveButtonText.textContent = 'Save Settings';
        }, 1500);
    });
}

// Function to load settings from chrome.storage.local when the popup opens
function loadSettings() {
    chrome.storage.local.get(['geminiApiKey', 'writingTone'], (items) => {
        if (items.geminiApiKey) {
            // Set the value back into the input field (masked)
            document.getElementById('apiKey').value = items.geminiApiKey;
        }
        if (items.writingTone) {
            // Set the selected option in the dropdown
            document.getElementById('toneSelect').value = items.writingTone;
        }
        
        // Show a temporary success message if we loaded a saved key
        if (items.geminiApiKey) {
            showStatus('Settings loaded from storage.');
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
