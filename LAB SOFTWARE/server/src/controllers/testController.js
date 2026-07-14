const db = require('../config/db');
const auditLog = require('../utils/auditLogger');

const testController = {
  // Get all tests in catalog
  getAll: async (req, res) => {
    try {
      const search = req.query.search || '';
      const department = req.query.department || '';
      
      let query = 'SELECT * FROM tests WHERE 1=1';
      let params = [];

      if (search) {
        query += ` AND (name LIKE $${params.length + 1} OR code LIKE $${params.length + 1})`;
        params.push(`%${search}%`);
      }

      if (department) {
        query += ` AND department = $${params.length + 1}`;
        params.push(department);
      }

      query += ' ORDER BY name ASC';

      const tests = await db.query(query, params);
      return res.json(tests);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Get test by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const test = await db.get('SELECT * FROM tests WHERE id = $1', [id]);
      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }
      return res.json(test);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Create new test entry
  create: async (req, res) => {
    try {
      const { code, name, department, price, normal_range, unit, template, description } = req.body;

      if (!code || !name || !department || price === undefined) {
        return res.status(400).json({ error: 'Code, name, department, and price are required.' });
      }

      // Check if test code exists
      const existing = await db.get('SELECT id FROM tests WHERE code = $1', [code]);
      if (existing) {
        return res.status(400).json({ error: 'A test with this code already exists.' });
      }

      // Serialize normal range if it's sent as an object/array
      const normalRangeStr = typeof normal_range === 'string' ? normal_range : JSON.stringify(normal_range || []);

      await db.run(
        `INSERT INTO tests (code, name, department, price, normal_range, unit, template, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          code.toUpperCase(),
          name,
          department,
          parseFloat(price),
          normalRangeStr,
          unit || '',
          template || '',
          description || ''
        ]
      );

      const newTest = await db.get('SELECT * FROM tests WHERE code = $1', [code.toUpperCase()]);

      await auditLog(
        req.user ? req.user.id : null,
        'Test Created',
        `Created diagnostic test: ${name} (${code.toUpperCase()})`,
        req.ip
      );

      return res.status(201).json(newTest);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Update test
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { code, name, department, price, normal_range, unit, template, description } = req.body;

      if (!code || !name || !department || price === undefined) {
        return res.status(400).json({ error: 'Code, name, department, and price are required.' });
      }

      const existingTest = await db.get('SELECT code FROM tests WHERE id = $1', [id]);
      if (!existingTest) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const normalRangeStr = typeof normal_range === 'string' ? normal_range : JSON.stringify(normal_range || []);

      await db.run(
        `UPDATE tests 
         SET code = $1, name = $2, department = $3, price = $4, normal_range = $5, unit = $6, template = $7, description = $8
         WHERE id = $9`,
        [
          code.toUpperCase(),
          name,
          department,
          parseFloat(price),
          normalRangeStr,
          unit || '',
          template || '',
          description || '',
          id
        ]
      );

      await auditLog(
        req.user ? req.user.id : null,
        'Test Updated',
        `Updated diagnostic test details: ${name} (${code.toUpperCase()})`,
        req.ip
      );

      const updatedTest = await db.get('SELECT * FROM tests WHERE id = $1', [id]);
      return res.json(updatedTest);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Delete test
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const test = await db.get('SELECT name, code FROM tests WHERE id = $1', [id]);
      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }

      // Check if reference exists in bill items
      const hasBillItem = await db.get('SELECT id FROM bill_items WHERE test_id = $1 LIMIT 1', [id]);
      if (hasBillItem) {
        return res.status(400).json({
          error: 'Cannot delete test. Test has historical references in generated bills.'
        });
      }

      await db.run('DELETE FROM tests WHERE id = $1', [id]);

      await auditLog(
        req.user ? req.user.id : null,
        'Test Deleted',
        `Deleted diagnostic test catalog entry: ${test.name} (${test.code})`,
        req.ip
      );

      return res.json({ message: 'Test deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = testController;
