const db = require('../config/db');

async function auditLog(userId, action, details = null, ipAddress = null) {
  try {
    await db.run(
      `INSERT INTO audit_logs (user_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [userId, action, details, ipAddress]
    );
  } catch (err) {
    console.error('Audit logger failed:', err.message);
  }
}

module.exports = auditLog;
