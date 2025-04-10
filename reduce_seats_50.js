require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DB_URL
});

async function reduceSeats() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to reduce seats for all trains...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'reduce_seats_50.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    await client.query(sql);
    
    console.log('Successfully reduced seats for all trains to a maximum of 50 total seats.');
    
    // Verify the changes
    const result = await client.query(`
      SELECT t.train_id, t.train_name, t.total_seats, 
             COUNT(tc.compartment_id) as compartment_count,
             SUM(tc.total_seats) as total_compartment_seats
      FROM trains t
      LEFT JOIN train_compartments tc ON t.train_id = tc.train_id
      GROUP BY t.train_id, t.train_name, t.total_seats
      ORDER BY t.train_id
    `);
    
    console.log('\nVerification of changes:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('Error reducing seats:', error);
  } finally {
    client.release();
    pool.end();
  }
}

reduceSeats(); 