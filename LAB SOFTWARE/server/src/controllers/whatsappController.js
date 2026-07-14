const db = require('../config/db');
const auditLog = require('../utils/auditLogger');
const notificationService = require('../utils/notificationService');
const generateReportPDF = require('../utils/pdfGenerator');

require('dotenv').config();

// Helper: Build the public PDF URL for a given report
function buildPdfUrl(reportId, token) {
  const baseUrl = process.env.PUBLIC_SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${baseUrl}/api/reports/${reportId}/pdf?token=${token}`;
}

// Helper: Interpolate template variables
function interpolateTemplate(body, vars) {
  return body
    .replace(/\{\{patient_name\}\}/g, vars.patient_name || '')
    .replace(/\{\{test_name\}\}/g, vars.test_name || '')
    .replace(/\{\{bill_number\}\}/g, vars.bill_number || '')
    .replace(/\{\{report_date\}\}/g, vars.report_date || '')
    .replace(/\{\{lab_name\}\}/g, vars.lab_name || 'Jyothi Lab')
    .replace(/\{\{phone\}\}/g, vars.phone || '9856628943')
    .replace(/\{\{address\}\}/g, vars.address || '')
    .replace(/\{\{email\}\}/g, vars.email || '');
}

// Helper: Format phone for WhatsApp (India default: prepend 91 if not already international)
function formatPhone(phone) {
  const cleaned = String(phone).replace(/[\s+\-()]/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned;
  if (cleaned.length === 10) return `91${cleaned}`;
  return cleaned;
}

const whatsappController = {

  // ── GET /api/whatsapp/logs ────────────────────────────────────────────────
  getLogs: async (req, res) => {
    try {
      const { search = '', status = '', page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let conditions = [];
      let params = [];

      if (search) {
        conditions.push(`(wl.patient_name LIKE $${params.length + 1} OR wl.patient_phone LIKE $${params.length + 2} OR wl.bill_number LIKE $${params.length + 3} OR wl.test_name LIKE $${params.length + 4})`);
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (status && status !== 'All') {
        conditions.push(`wl.status = $${params.length + 1}`);
        params.push(status);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

      const countRow = await db.get(
        `SELECT COUNT(*) as count FROM whatsapp_logs wl ${whereClause}`,
        params
      );
      const total = countRow ? countRow.count : 0;

      const logs = await db.query(
        `SELECT wl.* FROM whatsapp_logs wl ${whereClause} ORDER BY wl.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(limit), offset]
      );

      return res.json({ total, page: parseInt(page), limit: parseInt(limit), logs });
    } catch (err) {
      console.error('[WhatsApp] getLogs error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // ── GET /api/whatsapp/stats ────────────────────────────────────────────────
  getStats: async (req, res) => {
    try {
      const totalRow = await db.get('SELECT COUNT(*) as count FROM whatsapp_logs');
      const sentRow = await db.get("SELECT COUNT(*) as count FROM whatsapp_logs WHERE status IN ('Sent', 'Delivered', 'Sent (Simulated)')");
      const deliveredRow = await db.get("SELECT COUNT(*) as count FROM whatsapp_logs WHERE status = 'Delivered'");
      const failedRow = await db.get("SELECT COUNT(*) as count FROM whatsapp_logs WHERE status = 'Failed'");
      const pendingRow = await db.get("SELECT COUNT(*) as count FROM whatsapp_logs WHERE status = 'Pending'");

      // Reports approved but not yet sent via WhatsApp
      const unsentRow = await db.get(`
        SELECT COUNT(*) as count FROM reports r
        WHERE r.status = 'Approved'
        AND r.id NOT IN (SELECT report_id FROM whatsapp_logs WHERE report_id IS NOT NULL AND status NOT IN ('Failed'))
      `);

      return res.json({
        total: totalRow?.count || 0,
        sent: sentRow?.count || 0,
        delivered: deliveredRow?.count || 0,
        failed: failedRow?.count || 0,
        pending: pendingRow?.count || 0,
        unsentApproved: unsentRow?.count || 0
      });
    } catch (err) {
      console.error('[WhatsApp] getStats error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // ── GET /api/whatsapp/unsent ─────────────────────────────────────────────
  // Returns approved reports that haven't been successfully delivered yet
  getUnsentReports: async (req, res) => {
    try {
      const { search = '' } = req.query;

      let query = `
        SELECT 
          r.id as report_id,
          r.status as report_status,
          r.approved_at,
          p.id as patient_id,
          p.name as patient_name,
          p.phone as patient_phone,
          p.uhid as patient_uhid,
          t.name as test_name,
          t.department,
          b.bill_number,
          b.id as bill_id,
          (SELECT COUNT(*) FROM whatsapp_logs wl WHERE wl.report_id = r.id AND wl.status NOT IN ('Failed')) as already_sent
        FROM reports r
        JOIN patients p ON r.patient_id = p.id
        JOIN tests t ON r.test_id = t.id
        JOIN bills b ON r.bill_id = b.id
        WHERE r.status = 'Approved'
      `;
      const params = [];

      if (search) {
        query += ` AND (p.name LIKE $${params.length + 1} OR p.phone LIKE $${params.length + 2} OR b.bill_number LIKE $${params.length + 3} OR t.name LIKE $${params.length + 4})`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY r.id DESC LIMIT 200';

      const reports = await db.query(query, params);
      return res.json(reports);
    } catch (err) {
      console.error('[WhatsApp] getUnsentReports error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // ── POST /api/whatsapp/send/:reportId ───────────────────────────────────
  sendReport: async (req, res) => {
    try {
      const { reportId } = req.params;
      const { template_id } = req.body;
      const userToken = req.headers.authorization?.split(' ')[1] || '';

      // Fetch full report info
      const report = await db.get(`
        SELECT r.*, p.name as patient_name, p.phone as patient_phone, p.id as patient_id,
               t.name as test_name, b.bill_number, r.approved_at
        FROM reports r
        JOIN patients p ON r.patient_id = p.id
        JOIN tests t ON r.test_id = t.id
        JOIN bills b ON r.bill_id = b.id
        WHERE r.id = $1
      `, [reportId]);

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      if (report.status !== 'Approved') {
        return res.status(400).json({ error: 'Only approved reports can be sent via WhatsApp.' });
      }

      // Resolve template
      let template = null;
      if (template_id) {
        template = await db.get('SELECT * FROM wa_templates WHERE id = $1', [template_id]);
      }
      if (!template) {
        template = await db.get('SELECT * FROM wa_templates WHERE is_default = 1 LIMIT 1');
      }
      if (!template) {
        template = { body: 'Dear {{patient_name}}, your lab report {{test_name}} (Bill: {{bill_number}}) from {{lab_name}} is ready. Please find it attached.' };
      }

      // Fetch settings
      const settingsRows = await db.query('SELECT * FROM settings');
      const settings = {};
      settingsRows.forEach((r) => { settings[r.key] = r.value; });
      const receiptHeader = settings.receipt_header ? JSON.parse(settings.receipt_header) : {};

      // Build message
      const reportDate = report.approved_at
        ? new Date(report.approved_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN');

      const messageBody = interpolateTemplate(template.body, {
        patient_name: report.patient_name,
        test_name: report.test_name,
        bill_number: report.bill_number,
        report_date: reportDate,
        lab_name: receiptHeader.labName,
        phone: receiptHeader.phone,
        address: receiptHeader.address,
        email: receiptHeader.email
      });

      const phone = formatPhone(report.patient_phone);
      const pdfUrl = buildPdfUrl(reportId, userToken);

      // Insert a pending log entry first
      let logId;
      if (db.dialect === 'postgres') {
        const logInsert = await db.get(
          `INSERT INTO whatsapp_logs (report_id, patient_id, patient_name, patient_phone, bill_number, test_name, template_id, message_body, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending') RETURNING id`,
          [reportId, report.patient_id, report.patient_name, phone, report.bill_number, report.test_name, template?.id || null, messageBody]
        );
        logId = logInsert.id;
      } else {
        const logInsert = await db.run(
          `INSERT INTO whatsapp_logs (report_id, patient_id, patient_name, patient_phone, bill_number, test_name, template_id, message_body, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending')`,
          [reportId, report.patient_id, report.patient_name, phone, report.bill_number, report.test_name, template?.id || null, messageBody]
        );
        logId = logInsert.lastID;
      }

      // Send via WhatsApp
      const result = await notificationService.sendWhatsApp(phone, messageBody, pdfUrl);

      const newStatus = result.success ? (result.provider === 'SimulatedWhatsApp' ? 'Sent (Simulated)' : 'Sent') : 'Failed';
      const now = new Date().toISOString();

      await db.run(
        `UPDATE whatsapp_logs SET status = $1, wa_message_id = $2, error_message = $3, sent_at = $4 WHERE id = $5`,
        [newStatus, result.messageId || null, result.error || null, result.success ? now : null, logId]
      );

      await auditLog(
        req.user?.id || null,
        'WhatsApp Report Sent',
        `Report #${reportId} sent to ${report.patient_name} (${phone}). Status: ${newStatus}`,
        req.ip
      );

      return res.json({
        success: result.success,
        status: newStatus,
        logId,
        messageId: result.messageId,
        provider: result.provider,
        error: result.error || null,
        phone,
        messageBody,
        pdfUrl
      });
    } catch (err) {
      console.error('[WhatsApp] sendReport error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // ── POST /api/whatsapp/bulk ────────────────────────────────────────────────
  bulkSend: async (req, res) => {
    try {
      const { report_ids, template_id } = req.body;
      const userToken = req.headers.authorization?.split(' ')[1] || '';

      if (!report_ids || !Array.isArray(report_ids) || report_ids.length === 0) {
        return res.status(400).json({ error: 'report_ids array is required.' });
      }

      let template = null;
      if (template_id) {
        template = await db.get('SELECT * FROM wa_templates WHERE id = $1', [template_id]);
      }
      if (!template) {
        template = await db.get('SELECT * FROM wa_templates WHERE is_default = 1 LIMIT 1');
      }

      // Fetch settings
      const settingsRows = await db.query('SELECT * FROM settings');
      const settings = {};
      settingsRows.forEach((r) => { settings[r.key] = r.value; });
      const receiptHeader = settings.receipt_header ? JSON.parse(settings.receipt_header) : {};

      const results = [];

      for (const reportId of report_ids) {
        try {
          const report = await db.get(`
            SELECT r.*, p.name as patient_name, p.phone as patient_phone, p.id as patient_id,
                   t.name as test_name, b.bill_number, r.approved_at
            FROM reports r
            JOIN patients p ON r.patient_id = p.id
            JOIN tests t ON r.test_id = t.id
            JOIN bills b ON r.bill_id = b.id
            WHERE r.id = $1 AND r.status = 'Approved'
          `, [reportId]);

          if (!report) {
            results.push({ reportId, success: false, error: 'Report not found or not approved' });
            continue;
          }

          const reportDate = report.approved_at
            ? new Date(report.approved_at).toLocaleDateString('en-IN')
            : new Date().toLocaleDateString('en-IN');

          const messageBody = interpolateTemplate(template?.body || 'Dear {{patient_name}}, your report {{test_name}} ({{bill_number}}) from {{lab_name}} is ready.', {
            patient_name: report.patient_name,
            test_name: report.test_name,
            bill_number: report.bill_number,
            report_date: reportDate,
            lab_name: receiptHeader.labName,
            phone: receiptHeader.phone,
            address: receiptHeader.address,
            email: receiptHeader.email
          });

          const phone = formatPhone(report.patient_phone);
          const pdfUrl = buildPdfUrl(reportId, userToken);

          let logId;
          if (db.dialect === 'postgres') {
            const logInsert = await db.get(
              `INSERT INTO whatsapp_logs (report_id, patient_id, patient_name, patient_phone, bill_number, test_name, template_id, message_body, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending') RETURNING id`,
              [reportId, report.patient_id, report.patient_name, phone, report.bill_number, report.test_name, template?.id || null, messageBody]
            );
            logId = logInsert.id;
          } else {
            const logInsert = await db.run(
              `INSERT INTO whatsapp_logs (report_id, patient_id, patient_name, patient_phone, bill_number, test_name, template_id, message_body, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending')`,
              [reportId, report.patient_id, report.patient_name, phone, report.bill_number, report.test_name, template?.id || null, messageBody]
            );
            logId = logInsert.lastID;
          }
          const result = await notificationService.sendWhatsApp(phone, messageBody, pdfUrl);

          const newStatus = result.success ? (result.provider === 'SimulatedWhatsApp' ? 'Sent (Simulated)' : 'Sent') : 'Failed';
          const now = new Date().toISOString();

          await db.run(
            `UPDATE whatsapp_logs SET status = $1, wa_message_id = $2, error_message = $3, sent_at = $4 WHERE id = $5`,
            [newStatus, result.messageId || null, result.error || null, result.success ? now : null, logId]
          );

          results.push({ reportId, success: result.success, status: newStatus, logId });

          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 250));
        } catch (innerErr) {
          console.error(`[WhatsApp] Bulk send error for report ${reportId}:`, innerErr.message);
          results.push({ reportId, success: false, error: innerErr.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      await auditLog(req.user?.id || null, 'WhatsApp Bulk Send', `Bulk sent ${successCount}/${report_ids.length} reports`, req.ip);

      return res.json({ totalRequested: report_ids.length, successCount, failedCount: report_ids.length - successCount, results });
    } catch (err) {
      console.error('[WhatsApp] bulkSend error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // ── POST /api/whatsapp/retry/:logId ───────────────────────────────────────
  retryDelivery: async (req, res) => {
    try {
      const { logId } = req.params;
      const userToken = req.headers.authorization?.split(' ')[1] || '';

      const log = await db.get('SELECT * FROM whatsapp_logs WHERE id = $1', [logId]);
      if (!log) return res.status(404).json({ error: 'Log entry not found' });

      if (log.retry_count >= 5) {
        return res.status(400).json({ error: 'Maximum retry attempts (5) reached for this delivery.' });
      }

      const pdfUrl = log.report_id ? buildPdfUrl(log.report_id, userToken) : null;
      const result = await notificationService.sendWhatsApp(log.patient_phone, log.message_body, pdfUrl);

      const newStatus = result.success ? (result.provider === 'SimulatedWhatsApp' ? 'Sent (Simulated)' : 'Sent') : 'Failed';
      const now = new Date().toISOString();

      await db.run(
        `UPDATE whatsapp_logs SET status = $1, wa_message_id = $2, error_message = $3, sent_at = $4, retry_count = retry_count + 1 WHERE id = $5`,
        [newStatus, result.messageId || null, result.error || null, result.success ? now : null, logId]
      );

      return res.json({ 
        success: result.success, 
        status: newStatus, 
        retryCount: log.retry_count + 1,
        phone: log.patient_phone,
        messageBody: log.message_body,
        pdfUrl
      });
    } catch (err) {
      console.error('[WhatsApp] retryDelivery error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // ── GET /api/whatsapp/templates ──────────────────────────────────────────
  getTemplates: async (req, res) => {
    try {
      const templates = await db.query('SELECT * FROM wa_templates ORDER BY is_default DESC, id ASC');
      return res.json(templates);
    } catch (err) {
      console.error('[WhatsApp] getTemplates error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // ── POST /api/whatsapp/templates ─────────────────────────────────────────
  createTemplate: async (req, res) => {
    try {
      const { name, description, body, is_default } = req.body;
      if (!name || !body) return res.status(400).json({ error: 'Name and body are required.' });

      if (is_default) {
        await db.run('UPDATE wa_templates SET is_default = 0');
      }

      const result = await db.run(
        'INSERT INTO wa_templates (name, description, body, is_default) VALUES ($1, $2, $3, $4)',
        [name, description || '', body, is_default ? 1 : 0]
      );

      const newTemplate = await db.get('SELECT * FROM wa_templates WHERE id = $1', [result.lastID]);
      return res.status(201).json(newTemplate);
    } catch (err) {
      console.error('[WhatsApp] createTemplate error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // ── PUT /api/whatsapp/templates/:id ──────────────────────────────────────
  updateTemplate: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, body, is_default } = req.body;
      if (!name || !body) return res.status(400).json({ error: 'Name and body are required.' });

      const existing = await db.get('SELECT id FROM wa_templates WHERE id = $1', [id]);
      if (!existing) return res.status(404).json({ error: 'Template not found.' });

      if (is_default) {
        await db.run('UPDATE wa_templates SET is_default = 0');
      }

      await db.run(
        'UPDATE wa_templates SET name = $1, description = $2, body = $3, is_default = $4 WHERE id = $5',
        [name, description || '', body, is_default ? 1 : 0, id]
      );

      const updated = await db.get('SELECT * FROM wa_templates WHERE id = $1', [id]);
      return res.json(updated);
    } catch (err) {
      console.error('[WhatsApp] updateTemplate error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // ── DELETE /api/whatsapp/templates/:id ───────────────────────────────────
  deleteTemplate: async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await db.get('SELECT id, is_default FROM wa_templates WHERE id = $1', [id]);
      if (!existing) return res.status(404).json({ error: 'Template not found.' });
      if (existing.is_default) return res.status(400).json({ error: 'Cannot delete the default template. Set another as default first.' });

      await db.run('DELETE FROM wa_templates WHERE id = $1', [id]);
      return res.json({ message: 'Template deleted successfully.' });
    } catch (err) {
      console.error('[WhatsApp] deleteTemplate error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = whatsappController;
