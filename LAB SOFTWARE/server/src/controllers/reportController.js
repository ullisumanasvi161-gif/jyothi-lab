const db = require('../config/db');
const auditLog = require('../utils/auditLogger');
const generateReportPDF = require('../utils/pdfGenerator');
const notificationService = require('../utils/notificationService');

const reportController = {
  // Get reports queue (supports filter by status, search by patient name/uhid/phone)
  getAll: async (req, res) => {
    try {
      const search = req.query.search || '';
      const status = req.query.status || ''; // Pending, Waiting, Approved
      const department = req.query.department || '';

      let query = `
        SELECT r.*, 
               p.name as patient_name, p.uhid as patient_uhid, p.phone as patient_phone, 
               t.name as test_name, t.code as test_code, t.department, t.normal_range,
               b.bill_number
        FROM reports r
        JOIN patients p ON r.patient_id = p.id
        JOIN tests t ON r.test_id = t.id
        JOIN bills b ON r.bill_id = b.id
        WHERE 1=1
      `;
      let params = [];

      if (search) {
        query += ` AND (p.name LIKE $${params.length + 1} OR p.phone LIKE $${params.length + 2} OR p.uhid LIKE $${params.length + 3} OR b.bill_number LIKE $${params.length + 4})`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (status) {
        query += ` AND r.status = $${params.length + 1}`;
        params.push(status);
      }

      if (department) {
        query += ` AND t.department = $${params.length + 1}`;
        params.push(department);
      }

      query += ' ORDER BY r.id DESC';

      const reports = await db.query(query, params);
      
      const parsedReports = reports.map((r) => {
        try {
          return {
            ...r,
            normal_range: typeof r.normal_range === 'string' ? JSON.parse(r.normal_range) : (r.normal_range || []),
            result_values: typeof r.result_values === 'string' ? JSON.parse(r.result_values) : (r.result_values || {})
          };
        } catch {
          return { ...r, normal_range: [], result_values: {} };
        }
      });

      return res.json(parsedReports);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Get report by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const report = await db.get(
        `SELECT r.*, 
                p.name as patient_name, p.uhid as patient_uhid, p.gender, p.age, p.age_unit, p.phone as patient_phone, p.email as patient_email,
                t.name as test_name, t.code as test_code, t.department, t.normal_range, t.unit,
                b.bill_number, b.created_at as bill_date,
                u.name as approved_by_name
         FROM reports r
         JOIN patients p ON r.patient_id = p.id
         JOIN tests t ON r.test_id = t.id
         JOIN bills b ON r.bill_id = b.id
         LEFT JOIN users u ON r.approved_by = u.id
         WHERE r.id = $1`,
        [id]
      );

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Parse JSON fields
      if (report.result_values && typeof report.result_values === 'string') {
        report.result_values = JSON.parse(report.result_values);
      }
      if (report.normal_range && typeof report.normal_range === 'string') {
        report.normal_range = JSON.parse(report.normal_range);
      }

      return res.json(report);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Save report values (entered by Technicians or Pathologists)
  saveValues: async (req, res) => {
    try {
      const { id } = req.params;
      const { result_values } = req.body;

      if (!result_values) {
        return res.status(400).json({ error: 'Result values object is required.' });
      }

      const report = await db.get('SELECT status, test_id, patient_id FROM reports WHERE id = $1', [id]);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      if (report.status === 'Approved') {
        return res.status(400).json({ error: 'Cannot modify results of an approved report.' });
      }

      const test = await db.get('SELECT name FROM tests WHERE id = $1', [report.test_id]);
      const patient = await db.get('SELECT name FROM patients WHERE id = $1', [report.patient_id]);

      const resultValuesStr = typeof result_values === 'string' ? result_values : JSON.stringify(result_values);

      // Shifting status to 'Waiting' for Pathologist approval
      await db.run(
        `UPDATE reports 
         SET result_values = $1, status = 'Waiting' 
         WHERE id = $2`,
        [resultValuesStr, id]
      );

      await auditLog(
        req.user.id,
        'Report Saved',
        `Entered values for test: ${test.name} of Patient: ${patient.name} (Status set to: Waiting Approval)`,
        req.ip
      );

      return res.json({ message: 'Test results saved and sent for approval.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Pathologist approves report
  approve: async (req, res) => {
    try {
      const { id } = req.params;
      const report = await db.get('SELECT * FROM reports WHERE id = $1', [id]);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      if (report.status === 'Pending') {
        return res.status(400).json({ error: 'Cannot approve a report with no values entered.' });
      }

      if (report.status === 'Approved') {
        return res.status(400).json({ error: 'Report is already approved.' });
      }

      const test = await db.get('SELECT name FROM tests WHERE id = $1', [report.test_id]);
      const patient = await db.get('SELECT name, phone, email FROM patients WHERE id = $1', [report.patient_id]);
      const timestamp = new Date().toISOString();

      await db.run(
        `UPDATE reports 
         SET status = 'Approved', approved_by = $1, approved_at = $2 
         WHERE id = $3`,
        [req.user.id, timestamp, id]
      );

      await auditLog(
        req.user.id,
        'Report Approved',
        `Approved report for test: ${test.name} of Patient: ${patient.name}`,
        req.ip
      );

      // Fetch settings for dynamic lab name
      const settingsRows = await db.query('SELECT * FROM settings');
      const settings = {};
      settingsRows.forEach((r) => { settings[r.key] = r.value; });
      const receiptHeader = settings.receipt_header ? JSON.parse(settings.receipt_header) : {};
      const labName = receiptHeader.labName || 'Jyothi Lab';

      // Simulate sending WhatsApp/Email alerts
      const onlineReportLink = `https://jyothilab.com/reports/view/${id}`;
      
      await notificationService.sendWhatsApp(
        patient.phone,
        `Hello ${patient.name}, your test report for ${test.name} is approved. View online: ${onlineReportLink}`
      );
      
      if (patient.email) {
        await notificationService.sendEmail(
          patient.email,
          `${labName} - Test Report Approved (${test.name})`,
          `<p>Dear ${patient.name},</p><p>Your medical report for <b>${test.name}</b> has been verified and approved.</p><p><a href="${onlineReportLink}">Click here to view/download your report</a></p>`
        );
      }

      return res.json({ message: 'Report approved successfully and alerts sent.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Generate and stream report PDF
  downloadPDF: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Fetch entire data pack required for report PDF
      const report = await db.get('SELECT * FROM reports WHERE id = $1', [id]);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // If the token is for a Patient, verify it matches the requested report ID
      if (req.user && req.user.role === 'Patient' && Number(req.user.reportId) !== Number(id)) {
        return res.status(403).json({ error: 'Unauthorized: You do not have permission to view this report.' });
      }

      const patient = await db.get('SELECT * FROM patients WHERE id = $1', [report.patient_id]);
      const bill = await db.get('SELECT * FROM bills WHERE id = $1', [report.bill_id]);
      const test = await db.get('SELECT * FROM tests WHERE id = $1', [report.test_id]);
      const doctor = bill.referral_doctor_id ? await db.get('SELECT * FROM doctors WHERE id = $1', [bill.referral_doctor_id]) : null;
      const approver = report.approved_by ? await db.get('SELECT * FROM users WHERE id = $1', [report.approved_by]) : null;

      // Get settings
      const settingsRows = await db.query('SELECT * FROM settings');
      const settings = {};
      settingsRows.forEach((r) => { settings[r.key] = r.value; });

      const letterhead = req.query.letterhead !== 'false';

      // Find matching digital signature
      let signature = null;
      if (report.status === 'Approved') {
        // 1. Try specific department signature
        signature = await db.get(
          `SELECT * FROM signatures WHERE department = $1 LIMIT 1`,
          [test.department]
        );
        // 2. Try default department 'All' signature
        if (!signature) {
          signature = await db.get(
            `SELECT * FROM signatures WHERE department = 'All' OR department IS NULL OR department = '' LIMIT 1`
          );
        }
        // 3. Fallback to specific approver's signature
        if (!signature && report.approved_by) {
          signature = await db.get(
            `SELECT * FROM signatures WHERE user_id = $1 LIMIT 1`,
            [report.approved_by]
          );
        }
      }

      // Generate PDF
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const pdfBuffer = await generateReportPDF({
        patient,
        doctor,
        test,
        report,
        bill,
        settings,
        approver,
        letterhead,
        signature,
        baseUrl
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Report_${patient.uhid}_${test.code}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = reportController;
