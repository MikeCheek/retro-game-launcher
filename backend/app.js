const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Initialize database
const { initializeDatabase } = require('./db/database');
initializeDatabase().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/roms', require('./routes/romRoutes'));
app.use('/api/saves', require('./routes/saveRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Retro Game Launcher is running' });
});

// Serve main HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large', message: 'Request body exceeds limit' });
  }
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = Number(process.env.PORT) || 3333;
const server = app.listen(PORT, () => {
  console.log(`🎮 Retro Game Launcher is running on http://localhost:${PORT}`);
});

// Handle port in use error
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
    const retryPort = PORT + 1;
    app.listen(retryPort, () => {
      console.log(`🎮 Retro Game Launcher is running on http://localhost:${retryPort}`);
    });
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
