const db = require('../config/db');
const auditLog = require('../utils/auditLogger');

const settingController = {
  // Get all configurations
  getAll: async (req, res) => {
    try {
      const rows = await db.query('SELECT key, value FROM settings');
      const settings = {};
      
      rows.forEach((row) => {
        try {
          settings[row.key] = JSON.parse(row.value);
        } catch {
          settings[row.key] = row.value;
        }
      });

      return res.json(settings);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Save/update settings
  update: async (req, res) => {
    try {
      const settingsObject = req.body; // e.g. { receipt_header: {...}, report_settings: {...} }

      for (const [key, value] of Object.entries(settingsObject)) {
        const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

        // Check if key exists
        const exists = await db.get('SELECT id FROM settings WHERE key = $1', [key]);

        if (exists) {
          await db.run('UPDATE settings SET value = $1 WHERE key = $2', [valStr, key]);
        } else {
          await db.run('INSERT INTO settings (key, value) VALUES ($1, $2)', [key, valStr]);
        }
      }

      await auditLog(
        req.user.id,
        'Settings Updated',
        `Modified administrative settings: ${Object.keys(settingsObject).join(', ')}`,
        req.ip
      );

      return res.json({ message: 'Settings saved successfully.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = settingController;
