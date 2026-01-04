require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const cattleRoutes = require('./routes/cattle');
const authMiddleware = require('./middleware/authMiddleware');
const axios = require('axios'); // Added axios here as data.js needs it too

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/cattle', authMiddleware, cattleRoutes);

app.get('/', (req, res) => {
  res.send('Backend server is running.');
});

const server = http.createServer(app);

// WebSocket server setup
const wss = new WebSocketServer({ server });

let isEsp32Connected = false;

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send current ESP32 connection status to the newly connected client
  ws.send(JSON.stringify({ type: 'esp32-status', connected: isEsp32Connected }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'esp32-handshake') {
        console.log('ESP32 connected');
        ws.isEsp32 = true;
        isEsp32Connected = true;
        // Broadcast ESP32 connection status to all clients
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'esp32-status', connected: true }));
          }
        });
      }
    } catch (e) {
      console.log('Received non-JSON message:', message);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (ws.isEsp32) {
      console.log('ESP32 disconnected');
      isEsp32Connected = false;
      // Broadcast ESP32 connection status to all clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'esp32-status', connected: false }));
        }
      });
    }
  });
});

// Function to broadcast data to all clients
app.broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// Pass the broadcast function to the routes that need it
app.use((req, res, next) => {
  req.broadcast = app.broadcast;
  next();
});

const PORT = process.env.PORT || 3002;

server.on('error', (err) => {
  console.error(`Server failed to start on port ${PORT}:`, err);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
