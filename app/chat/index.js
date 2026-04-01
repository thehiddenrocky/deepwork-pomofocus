const fs = require('fs');
const path = require('path');
const os = require('os');

const messagesContainer = document.getElementById('messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

const logFilePath = path.join(os.homedir(), 'pomofocus-logs.csv');

function addMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(isUser ? 'user-message' : 'bot-message');
    msgDiv.innerText = text;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, true);
    chatInput.value = '';

    // Simple bot logic for now
    if (text.toLowerCase().includes('where are the things') || text.toLowerCase().includes('logs')) {
        if (fs.existsSync(logFilePath)) {
            const stats = fs.statSync(logFilePath);
            addMessage(`Your session logs are located at: ${logFilePath}. Last modified: ${stats.mtime.toLocaleString()}`);
        } else {
            addMessage("I couldn't find your session logs yet.");
        }
    } else {
        addMessage("I'm still learning! Ask me about your logs or where things are.");
    }
}

sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});

addMessage("Hello! I'm your PomoFocus assistant. How can I help you today?");
