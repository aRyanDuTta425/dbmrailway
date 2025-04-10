require('dotenv').config();
const { Pool } = require('pg');

// Create a new pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testTrainStatus() {
  try {
    console.log('Testing train status endpoint...');
    
    // First, check if the trains table exists
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Available tables:', tablesResult.rows.map(row => row.table_name));
    
    // Check the structure of the trains table
    const trainColumnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trains'
    `);
    
    console.log('Trains table columns:', trainColumnsResult.rows);
    
    // Check the structure of the train_types table
    const trainTypesColumnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'train_types'
    `);
    
    console.log('Train types table columns:', trainTypesColumnsResult.rows);
    
    // Check the structure of the maintenance_records table
    const maintenanceColumnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'maintenance_records'
    `);
    
    console.log('Maintenance records table columns:', maintenanceColumnsResult.rows);
    
    // Try a simple query to get train status
    const trainStatusResult = await pool.query(`
      SELECT 
        t.train_id,
        t.train_name,
        t.is_active,
        tt.type_name
      FROM trains t
      LEFT JOIN train_types tt ON t.train_type = tt.type_id
      WHERE t.is_active = true
      ORDER BY t.train_name
    `);
    
    console.log('Train status result:', trainStatusResult.rows);
    
    // Try to get schedules for a train
    if (trainStatusResult.rows.length > 0) {
      const trainId = trainStatusResult.rows[0].train_id;
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayNames[new Date().getDay()];
      
      const schedulesResult = await pool.query(`
        SELECT 
          COUNT(DISTINCT schedule_id) as active_schedules,
          MIN(departure_time) as next_departure
        FROM schedules
        WHERE train_id = $1
          AND is_active = true
          AND departure_time > CURRENT_TIME
          AND $2 = ANY(days_of_operation)
      `, [trainId, currentDayName]);
      
      console.log(`Schedules for train ${trainId}:`, schedulesResult.rows);
    }
    
    console.log('Test completed successfully');
  } catch (err) {
    console.error('Error in test:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      position: err.position
    });
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the test
testTrainStatus(); 