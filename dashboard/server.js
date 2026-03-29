const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3030;
const LOG_PATH = path.join(os.homedir(), 'pomofocus-logs.csv');

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
