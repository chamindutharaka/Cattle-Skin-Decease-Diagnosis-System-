const http = require('http');

const PORT = 3004; // Trying yet another port

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello from simple Node.js server!\n');
});

server.on('error', (err) => {
  console.error(`Simple Server failed to start on port ${PORT}:`, err.message);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => { // Explicitly binding to 127.0.0.1
  console.log(`Simple Server running at http://127.0.0.1:${PORT}/`);
});
