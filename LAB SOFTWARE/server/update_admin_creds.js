require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('12345', 10);
    await pool.query(
      "UPDATE users SET phone = $1, password = $2, name = $3 WHERE id = 5",
      ['9705308686', hashedPassword, 'Jyothi Lab Admin']
    );
    console.log("Admin user updated successfully!");
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
updateAdmin();
