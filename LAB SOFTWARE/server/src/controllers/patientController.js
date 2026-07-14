const db = require('../config/db');
const auditLog = require('../utils/auditLogger');

async function generateUHID() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `JL-${dateStr}-`;

  // Find patient count for today to generate sequential ID
  const row = await db.get(
    `SELECT COUNT(*) as count FROM patients WHERE uhid LIKE $1`,
    [`${prefix}%`]
  );

  const nextSeq = (row ? row.count : 0) + 1;
  const paddedSeq = String(nextSeq).padStart(4, '0');
  return `${prefix}${paddedSeq}`;
}

const patientController = {
  // Get all patients with search filter and pagination
  getAll: async (req, res) => {
    try {
      const search = req.query.search || '';
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;

      let countQuery = `SELECT COUNT(*) as count FROM patients`;
      let dataQuery = `
        SELECT p.*, d.name as referral_doctor_name 
        FROM patients p 
        LEFT JOIN doctors d ON p.referral_doctor_id = d.id
      `;
      let params = [];

      if (search) {
        countQuery += ` WHERE name LIKE $1 OR phone LIKE $2 OR uhid LIKE $3`;
        dataQuery += ` WHERE p.name LIKE $1 OR p.phone LIKE $2 OR p.uhid LIKE $3`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      dataQuery += ` ORDER BY p.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      
      const countRes = await db.get(countQuery, params);
      const total = countRes ? countRes.count : 0;

      const dataParams = [...params, limit, offset];
      const patients = await db.query(dataQuery, dataParams);

      return res.json({
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        patients
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Get single patient details
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const patient = await db.get(
        `SELECT p.*, d.name as referral_doctor_name 
         FROM patients p 
         LEFT JOIN doctors d ON p.referral_doctor_id = d.id 
         WHERE p.id = $1`,
        [id]
      );

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      return res.json(patient);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Get single patient details by UHID
  getByUHID: async (req, res) => {
    try {
      const { uhid } = req.params;
      const patient = await db.get(
        `SELECT p.*, d.name as referral_doctor_name 
         FROM patients p 
         LEFT JOIN doctors d ON p.referral_doctor_id = d.id 
         WHERE p.uhid = $1`,
        [uhid]
      );

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      return res.json(patient);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Get patient clinical and billing history
  getHistory: async (req, res) => {
    try {
      const { id } = req.params;

      // Fetch patient's bills
      const bills = await db.query(
        `SELECT b.*, d.name as doctor_name 
         FROM bills b 
         LEFT JOIN doctors d ON b.referral_doctor_id = d.id 
         WHERE b.patient_id = $1 
         ORDER BY b.id DESC`,
        [id]
      );

      // Fetch patient's reports
      const reports = await db.query(
        `SELECT r.*, t.name as test_name, t.department 
         FROM reports r 
         JOIN tests t ON r.test_id = t.id 
         WHERE r.patient_id = $1 
         ORDER BY r.id DESC`,
        [id]
      );

      return res.json({ bills, reports });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Create new patient
  create: async (req, res) => {
    try {
      const { 
        name, gender, age, age_unit, phone, email, address, referral_doctor_id,
        patient_type, insurance_company, policy_number, policy_holder_name, insurance_id, coverage_amount, corporate_company, insurance_document_path
      } = req.body;

      if (!name || !gender || !age || !phone) {
        return res.status(400).json({ error: 'Name, gender, age, and phone number are required.' });
      }

      // Check if patient already exists with the same name and phone
      const existing = await db.get(
        'SELECT * FROM patients WHERE LOWER(name) = LOWER($1) AND phone = $2',
        [name, phone]
      );
      if (existing) {
        return res.status(400).json({ error: 'A patient with this name and phone number already exists.' });
      }

      const uhid = await generateUHID();

      await db.run(
        `INSERT INTO patients (
          uhid, name, gender, age, age_unit, phone, email, address, referral_doctor_id,
          patient_type, insurance_company, policy_number, policy_holder_name, insurance_id, coverage_amount, corporate_company, insurance_document_path
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          uhid,
          name,
          gender,
          age,
          age_unit || 'Years',
          phone,
          email || null,
          address || null,
          referral_doctor_id || null,
          patient_type || 'General',
          insurance_company || null,
          policy_number || null,
          policy_holder_name || null,
          insurance_id || null,
          parseFloat(coverage_amount) || 0.0,
          corporate_company || null,
          insurance_document_path || null
        ]
      );

      // Fetch the created patient
      const newPatient = await db.get('SELECT * FROM patients WHERE uhid = $1', [uhid]);

      await auditLog(
        req.user ? req.user.id : null,
        'Patient Created',
        `Registered patient ${name} with UHID ${uhid}`,
        req.ip
      );

      return res.status(201).json(newPatient);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Update patient details
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        name, gender, age, age_unit, phone, email, address, referral_doctor_id,
        patient_type, insurance_company, policy_number, policy_holder_name, insurance_id, coverage_amount, corporate_company, insurance_document_path
      } = req.body;

      if (!name || !gender || !age || !phone) {
        return res.status(400).json({ error: 'Name, gender, age, and phone number are required.' });
      }

      const existingPatient = await db.get('SELECT uhid FROM patients WHERE id = $1', [id]);
      if (!existingPatient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      await db.run(
        `UPDATE patients 
         SET name = $1, gender = $2, age = $3, age_unit = $4, phone = $5, email = $6, address = $7, referral_doctor_id = $8,
             patient_type = $9, insurance_company = $10, policy_number = $11, policy_holder_name = $12, insurance_id = $13, 
             coverage_amount = $14, corporate_company = $15, insurance_document_path = $16
         WHERE id = $17`,
        [
          name,
          gender,
          age,
          age_unit || 'Years',
          phone,
          email || null,
          address || null,
          referral_doctor_id || null,
          patient_type || 'General',
          insurance_company || null,
          policy_number || null,
          policy_holder_name || null,
          insurance_id || null,
          parseFloat(coverage_amount) || 0.0,
          corporate_company || null,
          insurance_document_path || null,
          id
        ]
      );

      await auditLog(
        req.user ? req.user.id : null,
        'Patient Updated',
        `Updated patient profile ${name} (UHID: ${existingPatient.uhid})`,
        req.ip
      );

      const updatedPatient = await db.get('SELECT * FROM patients WHERE id = $1', [id]);
      return res.json(updatedPatient);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Delete patient (Admin only)
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const patient = await db.get('SELECT name, uhid FROM patients WHERE id = $1', [id]);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Check if patient has billing references (RESTRICT cascade block)
      const bills = await db.get('SELECT id FROM bills WHERE patient_id = $1 LIMIT 1', [id]);
      if (bills) {
        return res.status(400).json({
          error: 'Cannot delete patient. Patient has historical bills. You can only update details.'
        });
      }

      await db.run('DELETE FROM patients WHERE id = $1', [id]);

      await auditLog(
        req.user ? req.user.id : null,
        'Patient Deleted',
        `Deleted patient record ${patient.name} (UHID: ${patient.uhid})`,
        req.ip
      );

      return res.json({ message: 'Patient record deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = patientController;
