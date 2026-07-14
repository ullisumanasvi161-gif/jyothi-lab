const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    return;
  }
});

db.serialize(() => {
  db.all('SELECT key, value FROM settings', (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }
    rows.forEach((row) => {
      let newValue = row.value
        .replace(/Mithra Diagnostic Centre/g, 'Jyothi Lab')
        .replace(/MITHRA DIAGNOSTIC CENTRE/g, 'JYOTHI LAB')
        .replace(/mithradiagnosticcentre\.com/g, 'jyothilab.com')
        .replace(/mithradiagnosticcentre/g, 'jyothilab')
        .replace(/Mithra/g, 'Jyothi')
        .replace(/mithra/g, 'jyothi')
        .replace(/MITHRA/g, 'JYOTHI');
      
      if (newValue !== row.value) {
        db.run('UPDATE settings SET value = ? WHERE key = ?', [newValue, row.key], (err) => {
          if (err) console.error(err);
          else console.log(`Updated setting: ${row.key}`);
        });
      }
    });
  });
  
  db.all('SELECT id, email FROM users', (err, rows) => {
    if (err) return;
    rows.forEach((row) => {
        if(row.email) {
          let newEmail = row.email.replace(/mithradiagnosticcentre\.com/g, 'jyothilab.com');
          if (newEmail !== row.email) {
            db.run('UPDATE users SET email = ? WHERE id = ?', [newEmail, row.id], (err) => {
               if(!err) console.log(`Updated user ${row.id}`);
            });
          }
        }
    });
  });
});

setTimeout(() => db.close(), 1000);
