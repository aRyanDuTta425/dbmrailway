require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DB_URL
});

async function checkTrains() {
  const client = await pool.connect();
  
  try {
    console.log('Checking existing trains...');
    
    const result = await client.query(`
      SELECT train_id, train_name, train_type, total_seats, is_active
      FROM trains
      ORDER BY train_id
    `);
    
    console.log('\nExisting trains:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('Error checking trains:', error);
  } finally {
    client.release();
    pool.end();
  }
}

checkTrains(); 