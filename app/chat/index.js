const fs = require('fs');
const path = require('path');
const os = require('os');

const messagesContainer = document.getElementById('messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

const logFilePath = path.join(os.homedir(), 'pomofocus-logs.csv');

const DEEP_WORK_TIPS = [
    "**Attention Residue:** Every time you switch tasks, your brain stays focused on the previous task for up to 20 minutes. Stick to one thing!",
    "**The Lead Measure:** Don't focus on the result. Focus on the *uninterrupted hours* spent on the task.",
    "**Ritualize:** Have a specific place and time for deep work to lower the activation energy required to start.",
    "**Productive Meditation:** While doing a mindless task (walking, showering), focus your attention on a single well-defined professional problem."
];

function addMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(isUser ? 'user-message' : 'bot-message');
    
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

async function botReply(text, delay = 600) {
    const typing = showTyping();
    await new Promise(resolve => setTimeout(resolve, delay));
    typing.remove();
    addMessage(text);
}

function parseLogs() {
    if (!fs.existsSync(logFilePath)) return [];
    try {
        const data = fs.readFileSync(logFilePath, 'utf8');
        const lines = data.trim().split('\n');
        const logEntries = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            let parts = [];
            let inQuotes = false;
            let currentPart = '';
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) {
                    parts.push(currentPart.trim());
                    currentPart = '';
                } else currentPart += char;
            }
            parts.push(currentPart.trim());

            if (parts.length >= 3) {
                logEntries.push({
                    start: new Date(parts[0]),
                    end: new Date(parts[1]),
                    type: parts[2].replace(/^"|"$/g, ''),
                    note: parts[3] ? parts[3].replace(/^"|"$/g, '') : 'Uncategorized',
                    duration: (new Date(parts[1]) - new Date(parts[0])) / 60000
                });
            }
        }
        return logEntries;
    } catch (err) {
        return [];
    }
}

async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, true);
    chatInput.value = '';

    const lowerText = text.toLowerCase();
    const logs = parseLogs();

    if (logs.length === 0) {
        await botReply("I don't have enough data to analyze yet. Start some focus sessions!");
        return;
    }

    // --- STRUGGLE ANALYSIS ---
    if (lowerText.includes('struggle') || lowerText.includes('problem') || lowerText.includes('bad')) {
        const focusSessions = logs.filter(l => l.type.includes('Focus'));
        const shallowSessions = focusSessions.filter(s => s.duration < 15);
        const contextSwitches = new Set(focusSessions.slice(-10).map(s => s.note)).size;

        let analysis = "**Performance Audit:**\n";
        
        if (shallowSessions.length > focusSessions.length * 0.3) {
            analysis += `• **Shallow Work Warning:** ${shallowSessions.length} of your recent sessions were under 15 mins. You're likely succumbing to distractions before reaching a flow state.\n`;
        }
        
        if (contextSwitches > 4) {
            analysis += `• **High Switching Cost:** You've worked on ${contextSwitches} different topics in your last 10 sessions. This 'Attention Residue' is draining your mental energy.\n`;
        }

        if (analysis === "**Performance Audit:**\n") {
            analysis += "Actually, your session discipline looks solid. No major 'shallow' patterns detected. Keep it up!";
        } else {
            analysis += "\n**Recommendation:** Try a 'Monastic' block. Pick one task and commit to 50 minutes without checking any other apps.";
        }
        
        await botReply(analysis);
        return;
    }

    // --- TOP PROJECTS / MOST PRODUCTIVE ---
    if (lowerText.includes('most') || lowerText.includes('top') || lowerText.includes('best')) {
        const stats = {};
        logs.filter(l => l.type.includes('Focus')).forEach(s => {
            stats[s.note] = (stats[s.note] || 0) + s.duration;
        });

        const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
        const top = sorted[0];

        if (top) {
            await botReply(`Your lead measure is strongest on **${top[0]}**, with a total of \`${Math.round(top[1])} minutes\` of deep focus.`);
        }
        return;
    }

    // --- AVERAGE / TRENDS ---
    if (lowerText.includes('average') || lowerText.includes('typical')) {
        const focus = logs.filter(l => l.type.includes('Focus'));
        const avg = focus.reduce((acc, l) => acc + l.duration, 0) / focus.length;
        await botReply(`Your average focus session lasts \`${Math.round(avg)} minutes\`. Cal Newport recommends aiming for 50-90 minute blocks for true deep work.`);
        return;
    }

    // --- COMMANDS ---
    if (lowerText.startsWith('/stats') || lowerText.includes('today') || lowerText.includes('yesterday')) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const targetDate = lowerText.includes('yesterday') ? new Date(today.getTime() - 86400000) : today;
        
        const filtered = logs.filter(l => l.start >= targetDate && l.start < new Date(targetDate.getTime() + 86400000));
        const focus = filtered.filter(l => l.type.includes('Focus'));
        const total = focus.reduce((acc, l) => acc + l.duration, 0);

        await botReply(`**REPORT:**\n• Focus: \`${Math.floor(total/60)}h ${Math.round(total%60)}m\`\n• Sessions: \`${focus.length}\``);
        return;
    }

    if (lowerText.includes('help')) {
        await botReply("Ask me:\n• 'Where do I struggle?'\n• 'What is my top project?'\n• 'What's my average session?'\n• Or type `/stats` for today's summary.");
        return;
    }

    if (lowerText.includes('tip')) {
        await botReply(DEEP_WORK_TIPS[Math.floor(Math.random() * DEEP_WORK_TIPS.length)]);
        return;
    }

    await botReply("I'm analyzing your logs. Try asking **'Where do I struggle?'** or **'What is my top project?'** to see deep work insights.");
}

sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

window.onload = async () => {
    await botReply("Assistant active. I've indexed your `pomofocus-logs.csv`. How can I help you optimize your deep work today?");
};
