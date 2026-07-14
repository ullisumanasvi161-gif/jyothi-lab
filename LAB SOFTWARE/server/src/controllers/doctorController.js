const db = require('../config/db');
const auditLog = require('../utils/auditLogger');

const doctorController = {
  // Get all doctors
  getAll: async (req, res) => {
    try {
      const search = req.query.search || '';
      let query = 'SELECT * FROM doctors';
      let params = [];

      if (search) {
        query += ' WHERE name LIKE $1 OR specialization LIKE $2 OR phone LIKE $3';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      query += ' ORDER BY name ASC';

      const doctors = await db.query(query, params);
      return res.json(doctors);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Get doctor by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const doctor = await db.get('SELECT * FROM doctors WHERE id = $1', [id]);
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor not found' });
      }
      return res.json(doctor);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Create new referral doctor
  create: async (req, res) => {
    try {
      const { name, phone, email, specialization, commission_percentage } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ error: 'Doctor name and phone number are required.' });
      }

      await db.run(
        `INSERT INTO doctors (name, phone, email, specialization, commission_percentage)
         VALUES ($1, $2, $3, $4, $5)`,
        [name, phone, email || null, specialization || null, parseFloat(commission_percentage) || 0.0]
      );

      const newDoctor = await db.get('SELECT * FROM doctors WHERE name = $1 AND phone = $2', [name, phone]);

      await auditLog(
        req.user ? req.user.id : null,
        'Doctor Registered',
        `Registered doctor: ${name} (Commission: ${commission_percentage || 0}%)`,
        req.ip
      );

      return res.status(201).json(newDoctor);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Update doctor
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, email, specialization, commission_percentage } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ error: 'Doctor name and phone number are required.' });
      }

      const existingDoc = await db.get('SELECT name FROM doctors WHERE id = $1', [id]);
      if (!existingDoc) {
        return res.status(404).json({ error: 'Doctor not found' });
      }

      await db.run(
        `UPDATE doctors 
         SET name = $1, phone = $2, email = $3, specialization = $4, commission_percentage = $5
         WHERE id = $6`,
        [name, phone, email || null, specialization || null, parseFloat(commission_percentage) || 0.0, id]
      );

      await auditLog(
        req.user ? req.user.id : null,
        'Doctor Updated',
        `Updated doctor profile: ${name} (ID: ${id})`,
        req.ip
      );

      const updatedDoctor = await db.get('SELECT * FROM doctors WHERE id = $1', [id]);
      return res.json(updatedDoctor);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Delete doctor
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const doc = await db.get('SELECT name FROM doctors WHERE id = $1', [id]);
      if (!doc) {
        return res.status(404).json({ error: 'Doctor not found' });
      }

      // Safe check: nullify in bills and patients instead of restrict, but we handle standard references.
      await db.run('DELETE FROM doctors WHERE id = $1', [id]);

      await auditLog(
        req.user ? req.user.id : null,
        'Doctor Deleted',
        `Deleted doctor record: ${doc.name} (ID: ${id})`,
        req.ip
      );

      return res.json({ message: 'Doctor deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Retrieve commission summary
  getCommissions: async (req, res) => {
    try {
      const { id } = req.params;
      const doctor = await db.get('SELECT * FROM doctors WHERE id = $1', [id]);
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor not found' });
      }

      // Fetch all bills referred by this doctor
      const bills = await db.query(
        `SELECT b.id, b.bill_number, b.net_amount, b.created_at, p.name as patient_name 
         FROM bills b
         JOIN patients p ON b.patient_id = p.id
         WHERE b.referral_doctor_id = $1
         ORDER BY b.id DESC`,
        [id]
      );

      // Compute total commission earned
      let totalReferredAmount = 0;
      let totalCommissionEarned = 0;

      bills.forEach((bill) => {
        const net = parseFloat(bill.net_amount) || 0;
        totalReferredAmount += net;
        totalCommissionEarned += net * (parseFloat(doctor.commission_percentage) / 100);
      });

      return res.json({
        doctorName: doctor.name,
        commissionPercentage: doctor.commission_percentage,
        totalReferredAmount,
        totalCommissionEarned,
        bills
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  getMonthlyReferralsSummary: async (req, res) => {
    try {
      let queryText;
      if (db.dialect === 'postgres') {
        queryText = `
          SELECT 
            to_char(b.created_at, 'YYYY-MM') as month,
            SUM(b.net_amount) as total_referred_amount,
            SUM(b.net_amount * (d.commission_percentage / 100)) as total_commission
          FROM bills b
          JOIN doctors d ON b.referral_doctor_id = d.id
          GROUP BY to_char(b.created_at, 'YYYY-MM')
          ORDER BY month DESC
        `;
      } else {
        queryText = `
          SELECT 
            strftime('%Y-%m', b.created_at) as month,
            SUM(b.net_amount) as total_referred_amount,
            SUM(b.net_amount * (d.commission_percentage / 100)) as total_commission
          FROM bills b
          JOIN doctors d ON b.referral_doctor_id = d.id
          GROUP BY month
          ORDER BY month DESC
        `;
      }
      const rows = await db.query(queryText);

      const formatted = rows.map(r => ({
        month: r.month,
        totalReferredAmount: parseFloat(r.total_referred_amount) || 0,
        totalCommission: parseFloat(r.total_commission) || 0
      }));

      return res.json(formatted);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = doctorController;
