const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../db/database');

const router = express.Router();

// For now, simple session management without encryption
// TODO: Add proper authentication with bcrypt and JWT

// Create or get user session
router.post('/session', async (req, res) => {
  try {
    const { deviceId, deviceName } = req.body;
    const userId = req.body.userId || 'default-user';

    // Check if device session exists
    let session = await get('SELECT * FROM sessions WHERE user_id = ? AND device_id = ?', [userId, deviceId]);

    if (!session) {
      const sessionId = uuidv4();
      await run(
        `INSERT INTO sessions (id, user_id, device_id, device_name)
         VALUES (?, ?, ?, ?)`,
        [sessionId, userId, deviceId, deviceName],
      );
      session = { id: sessionId, user_id: userId, device_id: deviceId, device_name: deviceName };
    } else {
      // Update last active
      await run('UPDATE sessions SET last_active = CURRENT_TIMESTAMP WHERE id = ?', [session.id]);
    }

    res.json({ session, userId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create session', message: err.message });
  }
});

// Get user sessions (devices)
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    const sessions = await all(
      'SELECT id, device_id, device_name, last_active, created_at FROM sessions WHERE user_id = ? ORDER BY last_active DESC',
      [userId],
    );
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions', message: err.message });
  }
});

// Get user stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';

    const stats = await get(
      `SELECT 
        COUNT(DISTINCT id) as total_roms,
        SUM(CAST(file_size AS UNSIGNED)) as total_size,
        SUM(times_played) as total_plays,
        MAX(last_played) as last_played
       FROM roms 
       WHERE user_id = ?`,
      [userId],
    );

    const saveCount = await get('SELECT COUNT(*) as total_saves FROM save_states WHERE user_id = ?', [userId]);

    res.json({
      total_roms: stats.total_roms || 0,
      total_size: stats.total_size || 0,
      total_plays: stats.total_plays || 0,
      total_saves: saveCount.total_saves || 0,
      last_played: stats.last_played,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats', message: err.message });
  }
});

module.exports = router;
