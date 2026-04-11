const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const messagesContainer = document.getElementById('messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

const logFilePath = path.join(os.homedir(), 'pomofocus-logs.csv');

// Initialize Gemini
const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: modelName });

const SYSTEM_PROMPT = `You are a Deep Work Assistant for PomoFocus. 
Your goal is to help users optimize their focus and productivity based on their session logs and the "Deep Work" philosophy.

CORE PRINCIPLES of PomoFocus:
1. Zero-Latency State Changes (Keyboard First): Design interaction to minimize context switches.
2. Gamifying the Lead Measure: Track uninterrupted hours of deep focus, not just completed tasks.
3. Draining the Shallows (Intentionality Protocol): Every session should have a purpose.
4. Subconscious Progress Tracking: Use peripheral awareness to gauge time.

LOG FORMAT:
The logs are provided in CSV format: Start Time, End Time, Session Type (Focus/Break), Project, Note.

Your analysis should include:
- Best times of day for deep focus.
- Consistency and streaks.
- Top projects by total focus time.
- Identifying "Shallow Work" patterns (short sessions, frequent switches, vague notes).
- Recommendations based on Cal Newport's "Deep Work" philosophy.

Be concise, encouraging, and data-driven. Use markdown for formatting.`;

function addMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(isUser ? 'user-message' : 'bot-message');
    
    // Simple markdown-to-html conversion
    let processedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
        
    msgDiv.innerHTML = processedText;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return msgDiv;
}

function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'bot-message', 'typing-indicator');
    typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return typingDiv;
}

async function botReply(text, delay = 0) {
    const typing = showTyping();
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    typing.remove();
    addMessage(text);
}

function getRawLogs() {
    if (!fs.existsSync(logFilePath)) return "No logs found yet.";
    try {
        return fs.readFileSync(logFilePath, 'utf8');
    } catch (err) {
        return "Error reading logs.";
    }
}

async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    if (!process.env.GEMINI_API_KEY) {
        addMessage(text, true);
        chatInput.value = '';
        const dotEnvPath = path.join(__dirname, '..', '.env');
        await botReply(`Please set your \`GEMINI_API_KEY\` in the \`.env\` file in the \`app\` folder to use the smart assistant. I'm currently looking for it at: \`${dotEnvPath}\``);
        return;
    }

    addMessage(text, true);
    chatInput.value = '';

    const typing = showTyping();
    
    try {
        const logs = getRawLogs();
        const prompt = `${SYSTEM_PROMPT}\n\nUSER LOGS:\n${logs}\n\nUSER QUESTION: ${text}`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();
        
        typing.remove();
        addMessage(responseText);
    } catch (error) {
        typing.remove();
        addMessage(`Error: ${error.message}. Make sure your API key is correct and you have an internet connection.`);
    }
}

sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

window.onload = async () => {
    if (!process.env.GEMINI_API_KEY) {
        await botReply("Assistant active. Please set your `GEMINI_API_KEY` in `app/.env` to enable LLM-powered insights.");
    } else {
        await botReply("Assistant active. I've indexed your logs. How can I help you optimize your deep work today?");
    }
};
