require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create a new pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function reduceSeats() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to reduce seats in train compartments...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'reduce_seats.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    await client.query(sql);
    
    console.log('Successfully reduced seats in train compartments!');
    
    // Get the updated compartment information
    const result = await client.query(`
      SELECT tc.compartment_id, t.train_name, tc.class_id, tc.compartment_number, tc.total_seats
      FROM train_compartments tc
      JOIN trains t ON tc.train_id = t.train_id
      ORDER BY tc.compartment_id
    `);
    
    console.log('Updated compartment information:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('Error reducing seats:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the function
reduceSeats(); 