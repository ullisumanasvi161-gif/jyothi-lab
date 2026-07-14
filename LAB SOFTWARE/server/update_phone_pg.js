require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updatePhone() {
  const res = await pool.query("SELECT value FROM settings WHERE key = 'receipt_header'");
  let val = res.rows[0].value;
  let parsed = JSON.parse(val);
  parsed.phone = '+91 9705308686';
  await pool.query("UPDATE settings SET value = $1 WHERE key = 'receipt_header'", [JSON.stringify(parsed)]);
  console.log("Updated phone to +91 9705308686");
  pool.end();
}
updatePhone();
