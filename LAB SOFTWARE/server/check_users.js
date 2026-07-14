require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkUsers() {
  const res = await pool.query("SELECT id, name, phone, role FROM users");
  console.log(res.rows);
  pool.end();
}
checkUsers();
