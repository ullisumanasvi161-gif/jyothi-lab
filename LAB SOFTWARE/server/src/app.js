const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./config/db');
const authMiddleware = require('./middleware/authMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const testRoutes = require('./routes/testRoutes');
const billRoutes = require('./routes/billRoutes');
const reportRoutes = require('./routes/reportRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const settingRoutes = require('./routes/settingRoutes');
const exportRoutes = require('./routes/exportRoutes');
const signatureRoutes = require('./routes/signatureRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');

const app = express();

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Middlewares
const allowedOrigins = [
  process.env.PUBLIC_CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.5.1:5173',
  'https://jyothi-diagnostic-centre-lab.web.app',
  'https://jyothi-diagnostic-centre-lab.firebaseapp.com'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging to console (for development)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Dashboard Statistics Route (requires login)
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString().replace('T', ' ').substring(0, 19);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartIso = monthStart.toISOString().replace('T', ' ').substring(0, 19);

    // 7 days ago start
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysAgoIso = sevenDaysAgo.toISOString().replace('T', ' ').substring(0, 19);

    // 1. Today's Revenue
    const todayRevRow = await db.get(
      `SELECT SUM(amount) as total FROM payments WHERE created_at >= $1`,
      [todayStartIso]
    );
    const todayRevenue = parseFloat(todayRevRow ? todayRevRow.total : 0) || 0;

    // 2. Monthly Revenue
    const monthRevRow = await db.get(
      `SELECT SUM(amount) as total FROM payments WHERE created_at >= $1`,
      [monthStartIso]
    );
    const monthlyRevenue = parseFloat(monthRevRow ? monthRevRow.total : 0) || 0;

    // 3. Total Patients
    const patientsCountRow = await db.get(`SELECT COUNT(*) as count FROM patients`);
    const totalPatients = patientsCountRow ? patientsCountRow.count : 0;

    // 4. Report Counts
    const pendingRepRow = await db.get(`SELECT COUNT(*) as count FROM reports WHERE status = 'Pending'`);
    const pendingReports = pendingRepRow ? pendingRepRow.count : 0;

    const waitingRepRow = await db.get(`SELECT COUNT(*) as count FROM reports WHERE status = 'Waiting'`);
    const waitingReports = waitingRepRow ? waitingRepRow.count : 0;

    const approvedRepRow = await db.get(`SELECT COUNT(*) as count FROM reports WHERE status = 'Approved'`);
    const approvedReports = approvedRepRow ? approvedRepRow.count : 0;

    // 5. Payment Collection Summary
    const paymentSummary = await db.query(
      `SELECT payment_method, SUM(amount) as total FROM payments GROUP BY payment_method`
    );

    // 6. 7-Day Chart Data (Dialect-specific queries)
    let chartData = [];
    if (db.dialect === 'postgres') {
      chartData = await db.query(
        `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, SUM(amount) as total 
         FROM payments 
         WHERE created_at >= $1 
         GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD') 
         ORDER BY date ASC`,
        [sevenDaysAgoIso]
      );
    } else {
      chartData = await db.query(
        `SELECT strftime('%Y-%m-%d', created_at) as date, SUM(amount) as total 
         FROM payments 
         WHERE created_at >= $1 
         GROUP BY strftime('%Y-%m-%d', created_at) 
         ORDER BY date ASC`,
        [sevenDaysAgoIso]
      );
    }

    // Fill missing dates in chart data with 0 to prevent graph gaps
    const chartMap = new Map(chartData.map(item => [item.date, parseFloat(item.total) || 0]));
    const formattedChart = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      formattedChart.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        rawDate: dateStr,
        total: chartMap.get(dateStr) || 0
      });
    }

    return res.json({
      todayRevenue,
      monthlyRevenue,
      totalPatients,
      pendingReports,
      waitingReports,
      approvedReports,
      paymentSummary,
      revenueChart: formattedChart
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Default API Route
app.get('/', (req, res) => {
  res.json({ message: 'Jyothi Lab Management System API is running.' });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(`[Error Handler] ${err.stack || err.message || err}`);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
  res.status(status).json({ error: message });
});

module.exports = app;
