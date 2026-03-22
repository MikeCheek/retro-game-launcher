const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../db/database');

const router = express.Router();

// Configure multer for ROM uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const romDir = path.join(__dirname, '../../roms');
    if (!fs.existsSync(romDir)) {
      fs.mkdirSync(romDir, { recursive: true });
    }
    cb(null, romDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'bin',
      'cue',
      'iso',
      'nrg',
      'nes',
      'snes',
      'smc',
      'gen',
      'md',
      'gb',
      'gbc',
      'gba',
      'z64',
      'n64',
      'rom',
      'zip',
      'rar',
      '7z',
    ];
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${ext} not supported`));
    }
  },
});

// Helper function to calculate MD5 hash
function calculateFileMD5(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

// Detect game type from file extension
function detectGameType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const typeMap = {
    '.nes': 'NES',
    '.snes': 'SNES',
    '.smc': 'SNES',
    '.gen': 'Genesis',
    '.md': 'Mega Drive',
    '.gb': 'Game Boy',
    '.gbc': 'Game Boy Color',
    '.gba': 'Game Boy Advance',
    '.z64': 'N64',
    '.n64': 'N64',
    '.bin': 'CD Game',
    '.iso': 'CD Game',
    '.cue': 'CD Game',
  };
  return typeMap[ext] || 'Unknown';
}

// Upload ROM
router.post('/upload', upload.single('rom'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.body.userId || 'default-user'; // TODO: Get from auth middleware
    const filePath = req.file.path;
    const filename = req.file.originalname;
    const fileType = path.extname(filename).toLowerCase().slice(1);
    const gameType = detectGameType(filename);
    const fileSize = req.file.size;

    // Calculate MD5 hash
    const md5Hash = await calculateFileMD5(filePath);

    // Check if ROM already exists
    const existing = await get('SELECT id FROM roms WHERE user_id = ? AND md5_hash = ?', [userId, md5Hash]);

    if (existing) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'ROM already in library' });
    }

    const romId = uuidv4();
    await run(
      `INSERT INTO roms (id, user_id, title, filename, file_path, file_type, game_type, file_size, md5_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [romId, userId, filename, filename, filePath, fileType, gameType, fileSize, md5Hash],
    );

    res.json({
      id: romId,
      title: filename,
      gameType,
      fileSize,
      message: 'ROM uploaded successfully',
    });
  } catch (err) {
    console.error('Upload error:', err);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Upload failed', message: err.message });
  }
});

// Get all ROMs for user
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user'; // TODO: Get from auth middleware
    const roms = await all('SELECT * FROM roms WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(roms);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ROMs', message: err.message });
  }
});

// Get ROM by ID
router.get('/:id', async (req, res) => {
  try {
    const rom = await get('SELECT * FROM roms WHERE id = ?', [req.params.id]);
    if (!rom) {
      return res.status(404).json({ error: 'ROM not found' });
    }
    res.json(rom);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ROM', message: err.message });
  }
});

// Get ROM file
router.get('/:id/download', async (req, res) => {
  try {
    const rom = await get('SELECT * FROM roms WHERE id = ?', [req.params.id]);
    if (!rom) {
      return res.status(404).json({ error: 'ROM not found' });
    }

    if (!fs.existsSync(rom.file_path)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Update last played
    await run('UPDATE roms SET last_played = CURRENT_TIMESTAMP, times_played = times_played + 1 WHERE id = ?', [
      req.params.id,
    ]);

    res.download(rom.file_path, rom.filename);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download ROM', message: err.message });
  }
});

// Get ROM file for emulator playback
router.get('/:id/file', async (req, res) => {
  try {
    const rom = await get('SELECT * FROM roms WHERE id = ?', [req.params.id]);
    if (!rom) {
      return res.status(404).json({ error: 'ROM not found' });
    }

    if (!fs.existsSync(rom.file_path)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Update last played
    await run('UPDATE roms SET last_played = CURRENT_TIMESTAMP, times_played = times_played + 1 WHERE id = ?', [
      req.params.id,
    ]);

    // Send file as binary data
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${rom.filename}"`);
    res.sendFile(rom.file_path);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ROM file', message: err.message });
  }
});

// Update ROM metadata
router.put('/:id', async (req, res) => {
  try {
    const { title, description, coverImage } = req.body;
    await run('UPDATE roms SET title = ?, description = ?, cover_image = ? WHERE id = ?', [
      title || req.body.title,
      description,
      coverImage,
      req.params.id,
    ]);
    const updatedRom = await get('SELECT * FROM roms WHERE id = ?', [req.params.id]);
    res.json(updatedRom);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ROM', message: err.message });
  }
});

// Delete ROM
router.delete('/:id', async (req, res) => {
  try {
    const rom = await get('SELECT * FROM roms WHERE id = ?', [req.params.id]);
    if (!rom) {
      return res.status(404).json({ error: 'ROM not found' });
    }

    // Delete file
    if (fs.existsSync(rom.file_path)) {
      fs.unlinkSync(rom.file_path);
    }

    // Delete from database
    await run('DELETE FROM roms WHERE id = ?', [req.params.id]);
    await run('DELETE FROM save_states WHERE rom_id = ?', [req.params.id]);

    res.json({ message: 'ROM deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete ROM', message: err.message });
  }
});

// Search ROMs
router.get('/search/:query', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    const query = `%${req.params.query}%`;
    const results = await all(
      'SELECT * FROM roms WHERE user_id = ? AND (title LIKE ? OR game_type LIKE ?) ORDER BY times_played DESC',
      [userId, query, query],
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

module.exports = router;
