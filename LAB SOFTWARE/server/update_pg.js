require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateEmail() {
  const res = await pool.query("SELECT value FROM settings WHERE key = 'receipt_header'");
  let val = res.rows[0].value;
  val = val.replace('JyothiDiagnosticCentre@gmail.com', 'jyothilab@gmail.com');
  await pool.query("UPDATE settings SET value = $1 WHERE key = 'receipt_header'", [val]);
  console.log("Updated email to jyothilab@gmail.com");
  pool.end();
}
updateEmail();
