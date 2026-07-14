const fs = require('fs');
const pdfGenerator = require('./src/utils/pdfGenerator');
const db = require('./src/config/db');

async function test() {
    const report = await db.get('SELECT * FROM reports LIMIT 1');
    const patient = await db.get('SELECT * FROM patients WHERE id = ?', [report.patient_id]);
    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [report.bill_id]);
    const test = await db.get('SELECT * FROM tests WHERE id = ?', [report.test_id]);
    const settingsRows = await db.query('SELECT * FROM settings');
    const settings = {};
    settingsRows.forEach(r => settings[r.key] = r.value);

    const pdfBuffer = await pdfGenerator({
        patient, test, report, bill, settings, doctor: null, approver: null, signature: null, letterhead: true, baseUrl: 'http://localhost:5000'
    });

    fs.writeFileSync('test.pdf', pdfBuffer);
    const content = pdfBuffer.toString('utf-8');
    if (content.includes('Mithra')) {
        console.log('Mithra found in PDF string!');
    } else {
        console.log('Mithra NOT found in PDF string. It uses Jyothi Lab!');
    }
}
test().then(() => {
    db.close();
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
