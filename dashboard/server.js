const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Try to load dependencies from app directory
const APP_DIR = path.join(__dirname, '..', 'app');
try {
    const dotenvPath = path.join(APP_DIR, 'node_modules', 'dotenv');
    require(dotenvPath).config({ path: path.join(APP_DIR, '.env') });
} catch (e) {
    console.log('dotenv not found, skipping. Error:', e.message);
}

let GoogleGenerativeAI;
try {
    const aiModule = require(path.join(APP_DIR, 'node_modules', '@google', 'generative-ai'));
    GoogleGenerativeAI = aiModule.GoogleGenerativeAI;
} catch (e) {
    console.log('Google Generative AI not found, chat will be limited');
}

const PORT = 3030;
const LOG_PATH = path.join(os.homedir(), 'pomofocus-logs.csv');

const SYSTEM_PROMPT = `You are a Deep Work Assistant for PomoFocus. 
Your goal is to help users optimize their focus and productivity based on their session logs and the "Deep Work" philosophy.`;

const server = http.createServer((req, res) => {
    if (req.url === '/api/logs') {
        fs.readFile(LOG_PATH, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Log file not found', path: LOG_PATH }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/csv' });
            res.end(data);
        });
        return;
    }

    if (req.url === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { message } = JSON.parse(body);
                
                if (!process.env.GEMINI_API_KEY || !GoogleGenerativeAI) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ reply: "Assistant limited. Please ensure `GEMINI_API_KEY` is set in `app/.env` and dependencies are installed." }));
                    return;
                }

                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });
                
                let logs = "";
                if (fs.existsSync(LOG_PATH)) {
                    logs = fs.readFileSync(LOG_PATH, 'utf8');
                }

                const prompt = `${SYSTEM_PROMPT}\n\nUSER LOGS:\n${logs}\n\nUSER QUESTION: ${message}`;
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ reply: text }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml'
    };
    
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`PomoFocus Dashboard running at http://localhost:${PORT}/`);
    console.log(`Reading logs from: ${LOG_PATH}`);
});
