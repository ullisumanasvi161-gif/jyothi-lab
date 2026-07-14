require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function cleanupDuplicates() {
  try {
    const res = await pool.query("SELECT id, name, uhid, phone FROM patients WHERE name = 'Jyothi' AND phone = '7799510541' ORDER BY id DESC");
    console.log("Found:", res.rows);
    if (res.rows.length > 1) {
      const duplicateId = res.rows[0].id; // The most recently created one
      // check if it has bills
      const bills = await pool.query("SELECT id FROM bills WHERE patient_id = $1", [duplicateId]);
      if (bills.rows.length === 0) {
        await pool.query("DELETE FROM patients WHERE id = $1", [duplicateId]);
        console.log("Deleted duplicate patient with ID:", duplicateId);
      } else {
        console.log("Cannot delete, it has bills");
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
cleanupDuplicates();
