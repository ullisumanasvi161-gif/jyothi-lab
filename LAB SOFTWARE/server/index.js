const functions = require('firebase-functions');
const app = require('./src/app');
const initializeDatabase = require('./src/config/initDb');

let dbInitialized = false;

// Wrap express handler to ensure DB connection is initialized once
const apiHandler = async (req, res) => {
  if (!dbInitialized) {
    try {
      console.log('Firebase Functions: Initializing DB migrations/seeds...');
      await initializeDatabase();
      dbInitialized = true;
    } catch (err) {
      console.error('Firebase Functions: DB Initialization Error:', err);
    }
  }
  return app(req, res);
};

exports.api = functions.https.onRequest(apiHandler);
