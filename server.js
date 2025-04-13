const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    console.log(`Received request for: ${req.url}`);
    
    // Default to index.html
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    // Get the file extension
    const extname = path.extname(filePath);

    // Set content type based on file extension
    const contentType = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4'
    }[extname] || 'application/octet-stream';

    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': contentType
    };

    // Handle JavaScript modules
    if (extname === '.js' || extname === '.mjs') {
        headers['Content-Type'] = 'application/javascript';
    }

    // Read the file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            console.error(`Error reading file ${filePath}:`, error);
            if(error.code === 'ENOENT') {
                res.writeHead(404, headers);
                res.end(`File not found: ${filePath}`);
            } else {
                res.writeHead(500, headers);
                res.end(`Server error: ${error.code}`);
            }
        } else {
            console.log(`Successfully served: ${filePath}`);
            res.writeHead(200, headers);
            res.end(content, 'utf-8');
        }
    });
});

const port = 3000;

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please try a different port.`);
    } else {
        console.error('Server error:', error);
    }
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
    console.log('Press Ctrl+C to stop the server');
}); 