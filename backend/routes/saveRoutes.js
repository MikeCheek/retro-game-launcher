const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../db/database');

const router = express.Router();

// Create or update save state
router.post('/:romId', async (req, res) => {
  try {
    const { userId, slotNumber, stateData, screenshot } = req.body;
    const { romId } = req.params;

    if (!stateData) {
      return res.status(400).json({ error: 'stateData is required' });
    }

    // Check if save state exists for this slot
    const existing = await get('SELECT id FROM save_states WHERE user_id = ? AND rom_id = ? AND slot_number = ?', [
      userId,
      romId,
      slotNumber,
    ]);

    let saveId;
    if (existing) {
      saveId = existing.id;
      await run(
        `UPDATE save_states 
         SET state_data = ?, screenshot = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [stateData, screenshot || null, saveId],
      );
    } else {
      saveId = uuidv4();
      await run(
        `INSERT INTO save_states (id, user_id, rom_id, slot_number, state_data, screenshot, game_time)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [saveId, userId, romId, slotNumber, stateData, screenshot || null],
      );
    }

    const savedState = await get('SELECT * FROM save_states WHERE id = ?', [saveId]);
    res.json({
      message: 'Save state saved successfully',
      save: savedState,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save state', message: err.message });
  }
});

// Get save states for a ROM
router.get('/:romId', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    const { romId } = req.params;

    const saves = await all(
      `SELECT id, slot_number, screenshot, created_at, updated_at, game_time 
       FROM save_states 
       WHERE user_id = ? AND rom_id = ? 
       ORDER BY slot_number ASC`,
      [userId, romId],
    );
    res.json(saves);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch saves', message: err.message });
  }
});

// Get specific save state
router.get('/:romId/:slotNumber', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    const { romId, slotNumber } = req.params;

    const save = await get('SELECT * FROM save_states WHERE user_id = ? AND rom_id = ? AND slot_number = ?', [
      userId,
      romId,
      slotNumber,
    ]);

    if (!save) {
      return res.status(404).json({ error: 'Save state not found' });
    }

    res.json(save);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch save', message: err.message });
  }
});

// Delete save state
router.delete('/:romId/:slotNumber', async (req, res) => {
  try {
    const userId = req.body.userId || 'default-user';
    const { romId, slotNumber } = req.params;

    await run('DELETE FROM save_states WHERE user_id = ? AND rom_id = ? AND slot_number = ?', [
      userId,
      romId,
      slotNumber,
    ]);

    res.json({ message: 'Save state deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete save', message: err.message });
  }
});

// Get all saves for user (for cross-device sync)
router.get('/user/all', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    const saves = await all(
      `SELECT ss.*, r.title as rom_title 
       FROM save_states ss
       JOIN roms r ON ss.rom_id = r.id
       WHERE ss.user_id = ?
       ORDER BY ss.updated_at DESC`,
      [userId],
    );
    res.json(saves);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch saves', message: err.message });
  }
});

module.exports = router;
