const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const auditLog = require('../utils/auditLogger');

const signatureController = {
  // Get all signatures
  getAll: async (req, res) => {
    try {
      const query = `
        SELECT s.*, u.name as user_name, u.role as user_role 
        FROM signatures s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.id DESC
      `;
      const signatures = await db.query(query);
      return res.json(signatures);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Create new signature
  create: async (req, res) => {
    try {
      const { user_id, name, designation, department } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'Signature image file is required.' });
      }

      if (!user_id || !name || !designation) {
        // Delete uploaded file if metadata check fails to prevent orphan files
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: 'User ID, name, and designation are required.' });
      }

      // Check if user exists
      const user = await db.get('SELECT name FROM users WHERE id = $1', [user_id]);
      if (!user) {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ error: 'Selected user/doctor not found.' });
      }

      const signaturePath = `/uploads/signatures/${req.file.filename}`;

      await db.run(
        `INSERT INTO signatures (user_id, name, designation, department, signature_path)
         VALUES ($1, $2, $3, $4, $5)`,
        [user_id, name, designation, department || 'All', signaturePath]
      );

      await auditLog(
        req.user.id,
        'Signature Uploaded',
        `Uploaded digital signature for ${name} (${designation})`,
        req.ip
      );

      const newSig = await db.get(
        'SELECT * FROM signatures WHERE signature_path = $1',
        [signaturePath]
      );

      return res.status(201).json(newSig);
    } catch (err) {
      console.error(err);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Update signature metadata or image
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, designation, department } = req.body;

      if (!name || !designation) {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: 'Name and designation are required.' });
      }

      const existing = await db.get('SELECT * FROM signatures WHERE id = $1', [id]);
      if (!existing) {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ error: 'Signature record not found.' });
      }

      let signaturePath = existing.signature_path;

      if (req.file) {
        // Remove old physical file from disk
        const oldFileAbsolutePath = path.join(__dirname, '../..', existing.signature_path);
        if (fs.existsSync(oldFileAbsolutePath)) {
          try {
            fs.unlinkSync(oldFileAbsolutePath);
          } catch (e) {
            console.error('Failed to delete old signature file:', e);
          }
        }
        signaturePath = `/uploads/signatures/${req.file.filename}`;
      }

      await db.run(
        `UPDATE signatures
         SET name = $1, designation = $2, department = $3, signature_path = $4
         WHERE id = $5`,
        [name, designation, department || 'All', signaturePath, id]
      );

      await auditLog(
        req.user.id,
        'Signature Updated',
        `Updated digital signature details for ${name}`,
        req.ip
      );

      const updatedSig = await db.get('SELECT * FROM signatures WHERE id = $1', [id]);
      return res.json(updatedSig);
    } catch (err) {
      console.error(err);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Delete signature
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const existing = await db.get('SELECT * FROM signatures WHERE id = $1', [id]);
      if (!existing) {
        return res.status(404).json({ error: 'Signature record not found.' });
      }

      // Remove physical file from disk
      const fileAbsolutePath = path.join(__dirname, '../..', existing.signature_path);
      if (fs.existsSync(fileAbsolutePath)) {
        try {
          fs.unlinkSync(fileAbsolutePath);
        } catch (e) {
          console.error('Failed to delete signature file:', e);
        }
      }

      await db.run('DELETE FROM signatures WHERE id = $1', [id]);

      await auditLog(
        req.user.id,
        'Signature Deleted',
        `Deleted digital signature for ${existing.name}`,
        req.ip
      );

      return res.json({ message: 'Digital signature deleted successfully.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = signatureController;
