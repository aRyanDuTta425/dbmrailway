require('dotenv').config();
const { Pool } = require('pg');

// Create a new pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkCompartments() {
  const client = await pool.connect();
  
  try {
    // Check if there are any train compartments
    const result = await client.query(`
      SELECT COUNT(*) as count FROM train_compartments
    `);
    
    console.log(`Number of train compartments: ${result.rows[0].count}`);
    
    if (result.rows[0].count > 0) {
      // Get the compartment information
      const compartments = await client.query(`
        SELECT tc.compartment_id, t.train_name, tc.class_id, tc.compartment_number, tc.total_seats
        FROM train_compartments tc
        JOIN trains t ON tc.train_id = t.train_id
        ORDER BY tc.compartment_id
      `);
      
      console.log('Compartment information:');
      console.table(compartments.rows);
    } else {
      console.log('No train compartments found in the database.');
      
      // Check if there are any trains
      const trainResult = await client.query(`
        SELECT COUNT(*) as count FROM trains
      `);
      
      console.log(`Number of trains: ${trainResult.rows[0].count}`);
      
      if (trainResult.rows[0].count > 0) {
        // Get the train information
        const trains = await client.query(`
          SELECT train_id, train_name, train_type FROM trains
        `);
        
        console.log('Train information:');
        console.table(trains.rows);
      } else {
        console.log('No trains found in the database.');
      }
    }
    
  } catch (error) {
    console.error('Error checking compartments:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the function
checkCompartments(); 