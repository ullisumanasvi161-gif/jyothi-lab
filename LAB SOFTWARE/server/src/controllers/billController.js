const db = require('../config/db');
const auditLog = require('../utils/auditLogger');
const notificationService = require('../utils/notificationService');

async function generateBillNumber() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `JLB-${dateStr}-`;

  const row = await db.get(
    `SELECT COUNT(*) as count FROM bills WHERE bill_number LIKE $1`,
    [`${prefix}%`]
  );

  const nextSeq = (row ? row.count : 0) + 1;
  const paddedSeq = String(nextSeq).padStart(4, '0');
  return `${prefix}${paddedSeq}`;
}

const billController = {
  // Get bills list (supports patient search, payment status, date filters)
  getAll: async (req, res) => {
    try {
      const search = req.query.search || '';
      const status = req.query.status || '';
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;

      let countQuery = `
        SELECT COUNT(*) as count 
        FROM bills b 
        JOIN patients p ON b.patient_id = p.id
      `;
      let dataQuery = `
        SELECT b.*, p.name as patient_name, p.uhid as patient_uhid, p.phone as patient_phone, d.name as doctor_name
        FROM bills b
        JOIN patients p ON b.patient_id = p.id
        LEFT JOIN doctors d ON b.referral_doctor_id = d.id
      `;

      let conditions = [];
      let params = [];

      if (search) {
        conditions.push(`(p.name LIKE $${params.length + 1} OR p.phone LIKE $${params.length + 2} OR b.bill_number LIKE $${params.length + 3})`);
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (status) {
        conditions.push(`b.payment_status = $${params.length + 1}`);
        params.push(status);
      }

      if (conditions.length > 0) {
        const whereClause = ' WHERE ' + conditions.join(' AND ');
        countQuery += whereClause;
        dataQuery += whereClause;
      }

      dataQuery += ` ORDER BY b.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      
      const countRes = await db.get(countQuery, params);
      const total = countRes ? countRes.count : 0;

      const dataParams = [...params, limit, offset];
      const bills = await db.query(dataQuery, dataParams);

      return res.json({
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        bills
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Get specific bill with items
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const bill = await db.get(
        `SELECT b.*, p.name as patient_name, p.uhid as patient_uhid, p.age, p.gender, p.phone as patient_phone, d.name as doctor_name
         FROM bills b
         JOIN patients p ON b.patient_id = p.id
         LEFT JOIN doctors d ON b.referral_doctor_id = d.id
         WHERE b.id = $1`,
        [id]
      );

      if (!bill) {
        return res.status(404).json({ error: 'Bill not found' });
      }

      // Get bill items
      const items = await db.query(
        `SELECT bi.*, t.name as test_name, t.code as test_code, t.department
         FROM bill_items bi
         JOIN tests t ON bi.test_id = t.id
         WHERE bi.bill_id = $1`,
        [id]
      );

      // Get payments history
      const payments = await db.query(
        `SELECT * FROM payments WHERE bill_id = $1 ORDER BY id ASC`,
        [id]
      );

      return res.json({ bill, items, payments });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Get specific bill with items by bill number
  getByNumber: async (req, res) => {
    try {
      const { bill_number } = req.params;
      
      const bill = await db.get(
        `SELECT b.*, p.name as patient_name, p.uhid as patient_uhid, p.age, p.gender, p.phone as patient_phone, d.name as doctor_name
         FROM bills b
         JOIN patients p ON b.patient_id = p.id
         LEFT JOIN doctors d ON b.referral_doctor_id = d.id
         WHERE b.bill_number = $1`,
        [bill_number]
      );

      if (!bill) {
        return res.status(404).json({ error: 'Bill not found' });
      }

      // Get bill items using the bill.id
      const items = await db.query(
        `SELECT bi.*, t.name as test_name, t.code as test_code, t.department
         FROM bill_items bi
         JOIN tests t ON bi.test_id = t.id
         WHERE bi.bill_id = $1`,
        [bill.id]
      );

      // Get payments history
      const payments = await db.query(
        `SELECT * FROM payments WHERE bill_id = $1 ORDER BY id ASC`,
        [bill.id]
      );

      return res.json({ bill, items, payments });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Create new bill
  create: async (req, res) => {
    try {
      const { 
        patient_id, referral_doctor_id, test_ids, discount_amount, gst_percentage, paid_amount, payment_method, transaction_id,
        is_cashless, claim_status, claim_amount, insurance_company, policy_number, insurance_id, corporate_company
      } = req.body;

      if (!patient_id || !test_ids || !test_ids.length) {
        return res.status(400).json({ error: 'Patient ID and at least one Test ID are required.' });
      }

      const patient = await db.get('SELECT name, phone FROM patients WHERE id = $1', [patient_id]);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Fetch test details to calculate subtotal
      const testList = await db.query(
        `SELECT id, price, code, name FROM tests WHERE id IN (${test_ids.map((_, i) => `$${i + 1}`).join(',')})`,
        test_ids
      );

      if (testList.length !== test_ids.length) {
        return res.status(400).json({ error: 'One or more selected tests do not exist.' });
      }

      let subtotal = 0;
      testList.forEach((t) => { subtotal += parseFloat(t.price); });

      const discount = parseFloat(discount_amount) || 0.0;
      const discountedSubtotal = Math.max(0, subtotal - discount);

      // Calculate GST
      const gstRate = parseFloat(gst_percentage) || 0.0; // e.g. 5 for 5%
      const gstVal = discountedSubtotal * (gstRate / 100);
      const netAmount = discountedSubtotal + gstVal;

      const paid = parseFloat(paid_amount) || 0.0;
      const dueAmount = Math.max(0, netAmount - paid);

      // Determine Status
      let paymentStatus = 'Due';
      if (dueAmount === 0) {
        paymentStatus = 'Paid';
      } else if (paid > 0) {
        paymentStatus = 'Partial';
      }

      const billNumber = await generateBillNumber();

      // Create Bill
      const billResult = await db.run(
        `INSERT INTO bills (
          bill_number, patient_id, referral_doctor_id, total_amount, discount_amount, gst_amount, net_amount, paid_amount, due_amount, payment_status,
          is_cashless, claim_status, claim_amount, insurance_company, policy_number, insurance_id, corporate_company
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          billNumber,
          patient_id,
          referral_doctor_id || null,
          subtotal,
          discount,
          gstVal,
          netAmount,
          paid,
          dueAmount,
          paymentStatus,
          is_cashless ? 1 : 0,
          is_cashless ? (claim_status || 'Pre-Auth Pending') : 'None',
          is_cashless ? (parseFloat(claim_amount) >= 0 ? parseFloat(claim_amount) : dueAmount) : 0.0,
          insurance_company || null,
          policy_number || null,
          insurance_id || null,
          corporate_company || null
        ]
      );

      // Get inserted bill
      const bill = await db.get('SELECT * FROM bills WHERE bill_number = $1', [billNumber]);

      // Create Bill Items and Reports (empty results placeholder)
      for (const test of testList) {
        await db.run(
          `INSERT INTO bill_items (bill_id, test_id, price) VALUES ($1, $2, $3)`,
          [bill.id, test.id, test.price]
        );

        // Auto trigger report template setup
        await db.run(
          `INSERT INTO reports (bill_id, patient_id, test_id, status) VALUES ($1, $2, $3, 'Pending')`,
          [bill.id, patient_id, test.id]
        );
      }

      // If initial payment was made, record in payments table
      if (paid > 0) {
        await db.run(
          `INSERT INTO payments (bill_id, amount, payment_method, transaction_id)
           VALUES ($1, $2, $3, $4)`,
          [bill.id, paid, payment_method || 'Cash', transaction_id || null]
        );
      }

      await auditLog(
        req.user ? req.user.id : null,
        'Bill Created',
        `Generated bill ${billNumber} for ${patient.name}. Net: ₹${netAmount.toFixed(2)}, Paid: ₹${paid.toFixed(2)}`,
        req.ip
      );

      // Fetch settings for dynamic lab name
      const settingsRows = await db.query('SELECT * FROM settings');
      const settings = {};
      settingsRows.forEach((r) => { settings[r.key] = r.value; });
      const receiptHeader = settings.receipt_header ? JSON.parse(settings.receipt_header) : {};
      const labName = receiptHeader.labName || 'Jyothi Lab';

      // Send SMS alert simulation
      await notificationService.sendSMS(
        patient.phone,
        `Hello ${patient.name}, thank you for choosing ${labName}. Bill ${billNumber} generated for ₹${netAmount.toFixed(2)}. Current status: ${paymentStatus}.`
      );

      return res.status(201).json(bill);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Record a payment on a due bill
  addPayment: async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, payment_method, transaction_id } = req.body;

      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) {
        return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
      }

      const bill = await db.get('SELECT * FROM bills WHERE id = $1', [id]);
      if (!bill) {
        return res.status(404).json({ error: 'Bill not found' });
      }

      if (bill.due_amount <= 0) {
        return res.status(400).json({ error: 'This bill is already fully paid.' });
      }

      const newPaidAmount = parseFloat(bill.paid_amount) + amt;
      const newDueAmount = Math.max(0, parseFloat(bill.net_amount) - newPaidAmount);

      let status = 'Partial';
      if (newDueAmount === 0) {
        status = 'Paid';
      }

      // Update Bill
      await db.run(
        `UPDATE bills 
         SET paid_amount = $1, due_amount = $2, payment_status = $3
         WHERE id = $4`,
        [newPaidAmount, newDueAmount, status, id]
      );

      // Record Payment
      await db.run(
        `INSERT INTO payments (bill_id, amount, payment_method, transaction_id)
         VALUES ($1, $2, $3, $4)`,
        [id, amt, payment_method || 'Cash', transaction_id || null]
      );

      const patient = await db.get('SELECT name, phone FROM patients WHERE id = $1', [bill.patient_id]);

      await auditLog(
        req.user ? req.user.id : null,
        'Bill Payment Added',
        `Recorded payment of ₹${amt.toFixed(2)} on bill ${bill.bill_number}. Remaining due: ₹${newDueAmount.toFixed(2)}`,
        req.ip
      );

      // Fetch settings for dynamic lab name
      const settingsRows = await db.query('SELECT * FROM settings');
      const settings = {};
      settingsRows.forEach((r) => { settings[r.key] = r.value; });
      const receiptHeader = settings.receipt_header ? JSON.parse(settings.receipt_header) : {};
      const labName = receiptHeader.labName || 'Jyothi Lab';

      // Send SMS alert simulation
      await notificationService.sendSMS(
        patient.phone,
        `Dear ${patient.name}, payment of ₹${amt.toFixed(2)} received for ${labName} bill ${bill.bill_number}. Due remaining: ₹${newDueAmount.toFixed(2)}.`
      );

      return res.json({
        message: 'Payment recorded successfully',
        net_amount: bill.net_amount,
        paid_amount: newPaidAmount,
        due_amount: newDueAmount,
        payment_status: status
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  getPaymentsHistory: async (req, res) => {
    try {
      const { fromDate, toDate, search, paymentMethod } = req.query;
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;

      let countQuery = `
        SELECT COUNT(*) as count 
        FROM payments p
        JOIN bills b ON p.bill_id = b.id
        JOIN patients pat ON b.patient_id = pat.id
      `;

      let dataQuery = `
        SELECT 
          p.id as payment_id,
          p.amount as payment_amount,
          p.payment_method,
          p.transaction_id,
          p.created_at as payment_date,
          b.id as bill_id,
          b.bill_number,
          b.total_amount as bill_total,
          pat.name as patient_name,
          pat.uhid as patient_uhid,
          pat.phone as patient_phone
        FROM payments p
        JOIN bills b ON p.bill_id = b.id
        JOIN patients pat ON b.patient_id = pat.id
      `;

      let conditions = [];
      let params = [];

      if (fromDate) {
        conditions.push(`p.created_at >= $${params.length + 1}`);
        params.push(`${fromDate} 00:00:00`);
      }

      if (toDate) {
        conditions.push(`p.created_at <= $${params.length + 1}`);
        params.push(`${toDate} 23:59:59`);
      }

      if (search) {
        conditions.push(`(pat.name LIKE $${params.length + 1} OR pat.phone LIKE $${params.length + 2} OR b.bill_number LIKE $${params.length + 3})`);
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (paymentMethod && paymentMethod !== 'All' && paymentMethod !== 'Total Payment Collection') {
        conditions.push(`p.payment_method = $${params.length + 1}`);
        params.push(paymentMethod);
      }

      if (conditions.length > 0) {
        const whereClause = ' WHERE ' + conditions.join(' AND ');
        countQuery += whereClause;
        dataQuery += whereClause;
      }

      dataQuery += ` ORDER BY p.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

      const countRes = await db.get(countQuery, params);
      const total = countRes ? countRes.count : 0;

      const dataParams = [...params, limit, offset];
      const payments = await db.query(dataQuery, dataParams);

      // Calculate total amount collected in current filtered range
      let totalAmountQuery = `
        SELECT SUM(p.amount) as total 
        FROM payments p
        JOIN bills b ON p.bill_id = b.id
        JOIN patients pat ON b.patient_id = pat.id
      `;
      if (conditions.length > 0) {
        totalAmountQuery += ' WHERE ' + conditions.join(' AND ');
      }
      const sumRes = await db.get(totalAmountQuery, params);
      const totalAmountCollected = parseFloat(sumRes ? sumRes.total : 0) || 0;

      return res.json({
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalAmountCollected,
        payments
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  getClaims: async (req, res) => {
    try {
      const search = req.query.search || '';
      const status = req.query.status || '';
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;

      let countQuery = `
        SELECT COUNT(*) as count 
        FROM bills b 
        JOIN patients p ON b.patient_id = p.id
        WHERE b.is_cashless = 1
      `;
      let dataQuery = `
        SELECT b.*, p.name as patient_name, p.uhid as patient_uhid, p.phone as patient_phone
        FROM bills b
        JOIN patients p ON b.patient_id = p.id
        WHERE b.is_cashless = 1
      `;

      let conditions = [];
      let params = [];

      if (search) {
        conditions.push(`(p.name LIKE $${params.length + 1} OR p.phone LIKE $${params.length + 2} OR b.bill_number LIKE $${params.length + 3})`);
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (status && status !== 'All') {
        conditions.push(`b.claim_status = $${params.length + 1}`);
        params.push(status);
      }

      if (conditions.length > 0) {
        const condStr = ' AND ' + conditions.join(' AND ');
        countQuery += condStr;
        dataQuery += condStr;
      }

      dataQuery += ` ORDER BY b.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      
      const countRes = await db.get(countQuery, params);
      const total = countRes ? countRes.count : 0;

      const dataParams = [...params, limit, offset];
      const claims = await db.query(dataQuery, dataParams);

      return res.json({
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        claims
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  updateClaimStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { claim_status, settled_amount, payment_method, transaction_id } = req.body;

      if (!claim_status) {
        return res.status(400).json({ error: 'Claim status is required.' });
      }

      const bill = await db.get('SELECT * FROM bills WHERE id = $1', [id]);
      if (!bill) {
        return res.status(404).json({ error: 'Bill not found' });
      }

      let newPaidAmount = parseFloat(bill.paid_amount);
      let newDueAmount = parseFloat(bill.due_amount);
      let paymentStatus = bill.payment_status;

      const amt = parseFloat(settled_amount);
      if (!isNaN(amt) && amt > 0) {
        newPaidAmount += amt;
        newDueAmount = Math.max(0, parseFloat(bill.net_amount) - newPaidAmount);
        if (newDueAmount === 0) {
          paymentStatus = 'Paid';
        } else {
          paymentStatus = 'Partial';
        }

        // Record payment
        await db.run(
          `INSERT INTO payments (bill_id, amount, payment_method, transaction_id)
           VALUES ($1, $2, $3, $4)`,
          [id, amt, payment_method || 'Insurance Settlement', transaction_id || null]
        );
      }

      await db.run(
        `UPDATE bills 
         SET claim_status = $1, paid_amount = $2, due_amount = $3, payment_status = $4
         WHERE id = $5`,
        [claim_status, newPaidAmount, newDueAmount, paymentStatus, id]
      );

      const patient = await db.get('SELECT name FROM patients WHERE id = $1', [bill.patient_id]);
      await auditLog(
        req.user ? req.user.id : null,
        'Claim Status Updated',
        `Updated claim status for bill ${bill.bill_number} of ${patient.name} to ${claim_status}. Settled: ₹${isNaN(amt) ? 0 : amt}`,
        req.ip
      );

      return res.json({
        message: 'Claim status updated successfully',
        claim_status,
        due_amount: newDueAmount,
        paid_amount: newPaidAmount,
        payment_status: paymentStatus
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  getDuesSummary: async (req, res) => {
    try {
      const search = req.query.search || '';
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;

      let countQuery = `
        SELECT COUNT(DISTINCT b.patient_id) as count 
        FROM bills b 
        JOIN patients p ON b.patient_id = p.id
        WHERE b.due_amount > 0
      `;

      let dataQuery = `
        SELECT 
          p.id as patient_id,
          p.name as patient_name,
          p.uhid as patient_uhid,
          p.phone as patient_phone,
          SUM(b.due_amount) as total_due,
          COUNT(b.id) as due_bills_count
        FROM bills b
        JOIN patients p ON b.patient_id = p.id
        WHERE b.due_amount > 0
      `;

      let conditions = [];
      let params = [];

      if (search) {
        conditions.push(`(p.name LIKE $1 OR p.phone LIKE $2 OR p.uhid LIKE $3)`);
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (conditions.length > 0) {
        countQuery += ' AND ' + conditions.join(' AND ');
        dataQuery += ' AND ' + conditions.join(' AND ');
      }

      dataQuery += ` GROUP BY p.id, p.name, p.uhid, p.phone ORDER BY total_due DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

      const countRes = await db.get(countQuery, params);
      const total = countRes ? countRes.count : 0;

      const dataParams = [...params, limit, offset];
      const dues = await db.query(dataQuery, dataParams);

      // Also get the total outstanding dues across all matching/filtered patients
      let totalOutstandingQuery = `
        SELECT SUM(b.due_amount) as total_dues
        FROM bills b
        JOIN patients p ON b.patient_id = p.id
        WHERE b.due_amount > 0
      `;
      if (conditions.length > 0) {
        totalOutstandingQuery += ' AND ' + conditions.join(' AND ');
      }
      const totalOutstandingRes = await db.get(totalOutstandingQuery, params);
      const totalOutstandingDues = parseFloat(totalOutstandingRes ? totalOutstandingRes.total_dues : 0) || 0;

      return res.json({
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalOutstandingDues,
        dues
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  getPatientDues: async (req, res) => {
    try {
      const { patient_id } = req.params;
      const bills = await db.query(
        `SELECT b.*, p.name as patient_name, p.uhid as patient_uhid, p.phone as patient_phone
         FROM bills b
         JOIN patients p ON b.patient_id = p.id
         WHERE b.patient_id = $1 AND b.due_amount > 0
         ORDER BY b.id ASC`,
        [patient_id]
      );
      return res.json(bills);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = billController;
