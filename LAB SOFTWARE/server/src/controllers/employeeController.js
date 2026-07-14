const bcrypt = require('bcryptjs');
const db = require('../config/db');
const auditLog = require('../utils/auditLogger');

const employeeController = {
  // List all employees
  getAll: async (req, res) => {
    try {
      const search = req.query.search || '';
      let query = 'SELECT id, name, phone, email, role, is_active, created_at FROM users';
      let params = [];

      if (search) {
        query += ' WHERE name LIKE $1 OR phone LIKE $2 OR role LIKE $3';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      query += ' ORDER BY id DESC';

      const staff = await db.query(query, params);
      
      // SQLite returns is_active as 0/1, convert to boolean for standard API response
      const mappedStaff = staff.map(user => ({
        ...user,
        is_active: db.dialect === 'postgres' ? user.is_active : user.is_active === 1
      }));

      return res.json(mappedStaff);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Get employee details
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await db.get('SELECT id, name, phone, email, role, is_active, created_at FROM users WHERE id = $1', [id]);
      if (!user) {
        return res.status(404).json({ error: 'Staff member not found.' });
      }

      user.is_active = db.dialect === 'postgres' ? user.is_active : user.is_active === 1;
      return res.json(user);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Create new staff member
  create: async (req, res) => {
    try {
      const { name, phone, email, password, role, is_active } = req.body;

      if (!name || !phone || !password || !role) {
        return res.status(400).json({ error: 'Name, phone, password, and role are required.' });
      }

      const existing = await db.get('SELECT id FROM users WHERE phone = $1', [phone]);
      if (existing) {
        return res.status(400).json({ error: 'A staff member with this phone number already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const activeVal = is_active === false ? 0 : 1;

      await db.run(
        `INSERT INTO users (name, phone, email, password, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [name, phone, email || null, hashedPassword, role, db.dialect === 'postgres' ? (activeVal === 1) : activeVal]
      );

      await auditLog(
        req.user.id,
        'Staff Registered',
        `Provisioned credentials for ${name} as ${role}`,
        req.ip
      );

      return res.status(201).json({ message: 'Staff credentials created successfully.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Update staff credentials/role
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, email, password, role, is_active } = req.body;

      const user = await db.get('SELECT name, password FROM users WHERE id = $1', [id]);
      if (!user) {
        return res.status(404).json({ error: 'Staff member not found.' });
      }

      let hashedPassword = user.password;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      const activeVal = is_active === false ? 0 : 1;

      await db.run(
        `UPDATE users 
         SET name = $1, phone = $2, email = $3, password = $4, role = $5, is_active = $6
         WHERE id = $7`,
        [
          name,
          phone,
          email || null,
          hashedPassword,
          role,
          db.dialect === 'postgres' ? (activeVal === 1) : activeVal,
          id
        ]
      );

      await auditLog(
        req.user.id,
        'Staff Updated',
        `Updated staff record: ${name} (ID: ${id})`,
        req.ip
      );

      return res.json({ message: 'Staff credentials updated successfully.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Delete staff member permanently (Admin only)
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent deleting self
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'You cannot delete your own administrator account.' });
      }

      const user = await db.get('SELECT name FROM users WHERE id = $1', [id]);
      if (!user) {
        return res.status(404).json({ error: 'Staff member not found.' });
      }

      await db.run('DELETE FROM users WHERE id = $1', [id]);

      await auditLog(
        req.user.id,
        'Staff Deleted',
        `Permanently deleted staff member: ${user.name} (ID: ${id})`,
        req.ip
      );

      return res.json({ message: 'Staff member deleted permanently.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Toggle staff member active status (Admin only)
  toggleActive: async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent toggling self
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'You cannot suspend or deactivate your own administrator account.' });
      }

      const user = await db.get('SELECT name, is_active FROM users WHERE id = $1', [id]);
      if (!user) {
        return res.status(404).json({ error: 'Staff member not found.' });
      }

      const currentStatus = db.dialect === 'postgres' ? user.is_active : user.is_active === 1;
      const newStatus = !currentStatus;
      const dbVal = db.dialect === 'postgres' ? newStatus : (newStatus ? 1 : 0);

      await db.run(
        `UPDATE users SET is_active = $1 WHERE id = $2`,
        [dbVal, id]
      );

      const action = newStatus ? 'Activated' : 'Suspended';
      await auditLog(
        req.user.id,
        `Staff ${action}`,
        `${action} account for staff member: ${user.name} (ID: ${id})`,
        req.ip
      );

      return res.json({ message: `Staff member account ${action.toLowerCase()} successfully.` });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = employeeController;
