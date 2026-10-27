const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5050;
const BASE_DIR = path.resolve('D:/My Apps/Datagan Course');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // CORS & Cookies Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '/dashboard' || reqPath === '/index.html') {
    reqPath = '/replica_dashboard.html';
  }

  // Set auth cookies automatically on every response
  const cookies = [
    'datagan_auth_user=Ivan; Path=/; Max-Age=2592000; SameSite=Lax',
    'datagan_session_role=Enterprise IA Admin; Path=/; Max-Age=2592000; SameSite=Lax',
    'datagan_farm_id=36; Path=/; Max-Age=2592000; SameSite=Lax',
    'datagan_authenticated=true; Path=/; Max-Age=2592000; SameSite=Lax'
  ];
  res.setHeader('Set-Cookie', cookies);

  const filePath = path.join(BASE_DIR, reqPath);

  // Prevent directory traversal
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to replica_dashboard.html for SPA routes
      const fallback = path.join(BASE_DIR, 'replica_dashboard.html');
      fs.readFile(fallback, (err2, content) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Datagan Replica Server running at: http://localhost:${PORT}`);
  console.log(`📁 Serving directory: ${BASE_DIR}`);
  console.log(`🔐 Auto-authenticating with cookies for: Ivan (Enterprise IA)`);
});
