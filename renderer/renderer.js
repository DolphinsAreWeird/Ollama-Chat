// renderer/renderer.js - Client-side logic
// Global variables
let apiUrl = 'http://localhost:11434';
let currentModel = '';
let isGenerating = false;
let chatHistory = [];

// DOM Elements
const modelSelect = document.getElementById('model');
const refreshModelsButton = document.getElementById('refreshModels');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatContainer = document.getElementById('chatContainer');
const testConnectionButton = document.getElementById('testConnection');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const notification = document.getElementById('notification');
const temperatureSlider = document.getElementById('temperature');
const temperatureValue = document.getElementById('temperatureValue');
const maxTokensSlider = document.getElementById('maxTokens');
const maxTokensValue = document.getElementById('maxTokensValue');
const clearChatButton = document.getElementById('clearChat');
const exportChatButton = document.getElementById('exportChat');

// Auto-resize textarea as user types
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    
    // Enable/disable send button based on input
    sendButton.disabled = this.value.trim() === '';
});

// Update slider values
temperatureSlider.addEventListener('input', function() {
    temperatureValue.textContent = this.value;
});

maxTokensSlider.addEventListener('input', function() {
    maxTokensValue.textContent = this.value;
});

// Test connection to Ollama server
async function testConnection() {
    try {
        statusIndicator.className = 'status-indicator';
        statusText.textContent = 'Connecting...';
        testConnectionButton.disabled = true;
        
        const response = await fetch(`${apiUrl}/api/tags`);
        if (response.ok) {
            updateConnectionStatus(true);
            await fetchModels();
            showNotification('Successfully connected to Ollama server');
        } else {
            throw new Error(`Server returned ${response.status}`);
        }
    } catch (error) {
        console.error('Connection error:', error);
        updateConnectionStatus(false);
        showNotification('Failed to connect to Ollama server. Is it running?', 'error');
    } finally {
        testConnectionButton.disabled = false;
    }
}

// Update connection status UI
function updateConnectionStatus(connected) {
    if (connected) {
        statusIndicator.className = 'status-indicator status-connected';
        statusText.textContent = 'Connected';
        sendButton.disabled = userInput.value.trim() === '';
    } else {
        statusIndicator.className = 'status-indicator status-disconnected';
        statusText.textContent = 'Disconnected';
        sendButton.disabled = true;
        modelSelect.innerHTML = '<option value="">Connect to load models</option>';
    }
}

// Fetch available models
async function fetchModels() {
    try {
        modelSelect.innerHTML = '<option value="">Loading models...</option>';
        
        const response = await fetch(`${apiUrl}/api/tags`);
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.models && data.models.length > 0) {
            modelSelect.innerHTML = '';
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                
                // Format the size for display
                let sizeText = '';
                if (model.size < 1024 * 1024) {
                    sizeText = `(${(model.size / 1024).toFixed(1)} KB)`;
                } else if (model.size < 1024 * 1024 * 1024) {
                    sizeText = `(${(model.size / (1024 * 1024)).toFixed(1)} MB)`;
                } else {
                    sizeText = `(${(model.size / (1024 * 1024 * 1024)).toFixed(1)} GB)`;
                }
                
                option.textContent = `${model.name} ${sizeText}`;
                modelSelect.appendChild(option);
            });
            
            // Select the first model by default
            if (modelSelect.options.length > 0) {
                modelSelect.selectedIndex = 0;
                currentModel = modelSelect.value;
            }
            
            showNotification(`Loaded ${data.models.length} models`);
        } else {
            modelSelect.innerHTML = '<option value="">No models available</option>';
            showNotification('No models found. Try pulling one with the Ollama CLI', 'error');
        }
    } catch (error) {
        console.error('Error fetching models:', error);
        modelSelect.innerHTML = '<option value="">Error loading models</option>';
        showNotification('Failed to load models', 'error');
    }
}

// Show a notification
function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type === 'error' ? 'error' : 'info'} show`;
    
    setTimeout(() => {
        notification.className = 'notification';
    }, 3000);
}

// Add a message to the chat
function addMessage(content, isUser = false) {
    // Remove welcome message if it exists
    const welcomeContainer = document.querySelector('.welcome-container');
    if (welcomeContainer) {
        welcomeContainer.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'message-user' : 'message-bot'}`;
    
    // Apply some basic formatting for code blocks
    let formattedContent = content;
    
    // Handle code blocks with ```
    formattedContent = formattedContent.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
    
    // Handle inline code with `
    formattedContent = formattedContent.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Handle basic paragraphs
    formattedContent = formattedContent.split('\n\n').map(p => `<p>${p}</p>`).join('');
    
    // For single newlines that aren't already in a paragraph, replace with <br>
    if (!formattedContent.includes('<p>')) {
        formattedContent = formattedContent.replace(/\n/g, '<br>');
        formattedContent = `<p>${formattedContent}</p>`;
    }
    
    messageDiv.innerHTML = formattedContent;
    chatContainer.appendChild(messageDiv);
    
    // Store in chat history
    chatHistory.push({
        role: isUser ? 'user' : 'assistant',
        content: content
    });
    
    // Scroll to the bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typingIndicator';
    
    indicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    
    chatContainer.appendChild(indicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Send a message to the Ollama API
async function sendMessage() {
    const prompt = userInput.value.trim();
    
    if (!prompt) return;
    if (!currentModel) {
        showNotification('Please select a model first', 'error');
        return;
    }
    
    try {
        // Disable UI during generation
        isGenerating = true;
        sendButton.disabled = true;
        sendButton.innerHTML = '<div class="loading"></div>';
        
        // Add user message to chat
        addMessage(prompt, true);
        
        // Clear input
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // Show typing indicator
        showTypingIndicator();
        
        // Prepare request
        const temperature = parseFloat(temperatureSlider.value);
        const maxTokens = parseInt(maxTokensSlider.value);
        
        const response = await fetch(`${apiUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: currentModel,
                prompt: prompt,
                stream: true,
                options: {
                    temperature: temperature,
                    num_predict: maxTokens
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        
        // Hide typing indicator
        hideTypingIndicator();
        
        // Process streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                break;
            }
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.response) {
                        // This is the first chunk
                        if (fullResponse === '') {
                            addMessage(data.response);
                            fullResponse = data.response;
                        } else {
                            // Append to existing message
                            fullResponse += data.response;
                            
                            // Update the message content (the last message in the chat)
                            const lastMessage = chatContainer.lastElementChild;
                            
                            // Apply basic formatting again
                            let formattedContent = fullResponse;
                            
                            // Handle code blocks
                            formattedContent = formattedContent.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
                            
                            // Handle inline code
                            formattedContent = formattedContent.replace(/`([^`]+)`/g, '<code>$1</code>');
                            
                            // Handle basic paragraphs
                            formattedContent = formattedContent.split('\n\n').map(p => `<p>${p}</p>`).join('');
                            
                            // For single newlines
                            if (!formattedContent.includes('<p>')) {
                                formattedContent = formattedContent.replace(/\n/g, '<br>');
                                formattedContent = `<p>${formattedContent}</p>`;
                            }
                            
                            lastMessage.innerHTML = formattedContent;
                        }
                        
                        // Scroll to bottom as content comes in
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                    
                    if (data.done) {
                        break;
                    }
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                }
            }
        }
        
        // Update chat history with the final response
        if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'assistant') {
            // Update the last message instead of adding a new one (for cases where addMessage was only called once)
            chatHistory[chatHistory.length - 1].content = fullResponse;
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        showNotification('Error: ' + error.message, 'error');
    } finally {
        isGenerating = false;
        sendButton.disabled = false;
        sendButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
        `;
    }
}

// Clear the chat history
function clearChat() {
    chatHistory = [];
    chatContainer.innerHTML = `
        <div class="welcome-container">
            <h2>Chat Cleared</h2>
            <p>Start a new conversation with your AI model.</p>
            
            <div class="suggestions">
                <div class="suggestion" data-text="What is Ollama?">What is Ollama?</div>
                <div class="suggestion" data-text="Write a short poem about technology">Write a poem</div>
                <div class="suggestion" data-text="Explain quantum computing to a beginner">Explain quantum computing</div>
                <div class="suggestion" data-text="Write a Python function to reverse a string">Code example</div>
            </div>
        </div>
    `;
    
    // Reconnect suggestion click events
    document.querySelectorAll('.suggestion').forEach(setupSuggestionEvent);
    
    showNotification('Chat history cleared');
}

// Export chat history as markdown
async function exportChat() {
    if (chatHistory.length === 0) {
        showNotification('No chat history to export', 'error');
        return;
    }
    
    let markdown = '# Ollama Chat Export\n\n';
    markdown += `Date: ${new Date().toLocaleString()}\n`;
    markdown += `Model: ${currentModel}\n\n`;
    markdown += '---\n\n';
    
    chatHistory.forEach(entry => {
        const role = entry.role === 'user' ? '### You' : '### AI';
        markdown += `${role}\n\n${entry.content}\n\n`;
    });
    
    try {
        const saved = await window.electronAPI.saveChatToFile(markdown);
        if (saved) {
            showNotification('Chat exported successfully');
        }
    } catch (error) {
        console.error('Error exporting chat:', error);
        showNotification('Failed to export chat', 'error');
    }
}

// Helper function to set up suggestion click events
function setupSuggestionEvent(suggestion) {
    suggestion.addEventListener('click', function() {
        userInput.value = this.dataset.text;
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
        sendButton.disabled = false;
        sendMessage();
    });
}

// Event listeners
modelSelect.addEventListener('change', function() {
    currentModel = this.value;
});

refreshModelsButton.addEventListener('click', fetchModels);

userInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendButton.disabled) {
            sendMessage();
        }
    }
});

sendButton.addEventListener('click', sendMessage);
testConnectionButton.addEventListener('click', testConnection);
clearChatButton.addEventListener('click', clearChat);
exportChatButton.addEventListener('click', exportChat);

// Setup electron API events
window.electronAPI.onNewChat(() => {
    clearChat();
});

window.electronAPI.onExportChat(() => {
    exportChat();
});

// Setup suggestion clicks
document.querySelectorAll('.suggestion').forEach(setupSuggestionEvent);

// Initialize by testing connection
testConnection();

// Additional features to consider adding:
// 1. Chat history persistence
// 2. Multiple chat sessions
// 3. Custom system prompts
// 4. Model download interface