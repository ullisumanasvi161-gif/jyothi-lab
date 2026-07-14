const db = require('./src/config/db');

async function run() {
  try {
    const patients = await db.query('SELECT * FROM patients');
    console.log('=== ALL PATIENTS ===');
    console.log(JSON.stringify(patients, null, 2));

    const reports = await db.query('SELECT * FROM reports');
    console.log('=== ALL REPORTS ===');
    console.log(JSON.stringify(reports, null, 2));

    const bills = await db.query('SELECT * FROM bills');
    console.log('=== ALL BILLS ===');
    console.log(JSON.stringify(bills, null, 2));

  } catch (err) {
    console.error('Error running search:', err);
  } finally {
    process.exit(0);
  }
}

run();
