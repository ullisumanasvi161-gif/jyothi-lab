const app = require('./src/app');
const initializeDatabase = require('./src/config/initDb');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log('Starting Jyothi Lab Backend Server...');
  
  // Await database initialization
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`\n==========================================`);
    console.log(`Jyothi Lab Server running on port ${PORT}`);
    console.log(`API URL: http://localhost:${PORT}`);
    console.log(`==========================================\n`);
  });
}

startServer();
