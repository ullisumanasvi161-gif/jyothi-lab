const db = require('../config/db');

const exportController = {
  // Export bills / transactions between dates
  exportTransactions: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate parameters are required.' });
      }

      // Format query parameters
      const start = `${startDate} 00:00:00`;
      const end = `${endDate} 23:59:59`;

      const bills = await db.query(
        `SELECT b.bill_number, p.uhid as patient_uhid, p.name as patient_name, 
                b.total_amount, b.discount_amount, b.gst_amount, b.net_amount, 
                b.paid_amount, b.due_amount, b.payment_status, b.created_at
         FROM bills b
         JOIN patients p ON b.patient_id = p.id
         WHERE b.created_at BETWEEN $1 AND $2
         ORDER BY b.id ASC`,
        [start, end]
      );

      // Build CSV output
      let csv = 'Bill Number,Patient UHID,Patient Name,Subtotal (INR),Discount (INR),GST (INR),Net Total (INR),Paid Amount (INR),Due Amount (INR),Payment Status,Bill Date\n';
      
      bills.forEach((b) => {
        csv += `"${b.bill_number}","${b.patient_uhid}","${b.patient_name.replace(/"/g, '""')}",${b.total_amount},${b.discount_amount},${b.gst_amount},${b.net_amount},${b.paid_amount},${b.due_amount},"${b.payment_status}","${new Date(b.created_at).toLocaleString()}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="Transactions_${startDate}_to_${endDate}.csv"`);
      return res.send(csv);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Export diagnostic test volumes and revenues
  exportTests: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate parameters are required.' });
      }

      const start = `${startDate} 00:00:00`;
      const end = `${endDate} 23:59:59`;

      const testsData = await db.query(
        `SELECT t.code as test_code, t.name as test_name, t.department, 
                COUNT(bi.id) as total_tests_sold, SUM(bi.price) as total_revenue
         FROM bill_items bi
         JOIN tests t ON bi.test_id = t.id
         JOIN bills b ON bi.bill_id = b.id
         WHERE b.created_at BETWEEN $1 AND $2
         GROUP BY t.id, t.code, t.name, t.department
         ORDER BY total_tests_sold DESC`,
        [start, end]
      );

      let csv = 'Test Code,Test Name,Department,Total Times Ordered,Total Revenue Earned (INR)\n';

      testsData.forEach((t) => {
        csv += `"${t.test_code}","${t.test_name.replace(/"/g, '""')}","${t.department}",${t.total_tests_sold},${t.total_revenue}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="TestWiseVolume_${startDate}_to_${endDate}.csv"`);
      return res.send(csv);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = exportController;
