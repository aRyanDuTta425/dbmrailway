require('dotenv').config();
const { Pool } = require('pg');

// Create a new pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createCompartments() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Starting to create compartments for all trains...');
    
    // Get all trains
    const trainsResult = await client.query(`
      SELECT train_id, train_name, train_type FROM trains
    `);
    
    // Get all train classes
    const classesResult = await client.query(`
      SELECT class_id, class_name FROM train_classes
    `);
    
    console.log(`Found ${trainsResult.rows.length} trains and ${classesResult.rows.length} train classes.`);
    
    // Create compartments for each train
    for (const train of trainsResult.rows) {
      console.log(`Creating compartments for train: ${train.train_name} (ID: ${train.train_id})`);
      
      // Determine number of compartments based on train type
      let numCompartments = 3; // Default
      
      if (train.train_type === 1) { // Express
        numCompartments = 3;
      } else if (train.train_type === 2) { // Superfast
        numCompartments = 4;
      } else if (train.train_type === 3) { // Local
        numCompartments = 2;
      } else if (train.train_type === 4) { // Luxury
        numCompartments = 5;
      }
      
      // Create compartments with reduced seats
      for (let i = 1; i <= numCompartments; i++) {
        // Assign a class to this compartment (cycling through available classes)
        const classId = classesResult.rows[(i - 1) % classesResult.rows.length].class_id;
        
        // Determine number of seats based on class
        let totalSeats = 20; // Default
        
        if (classId === 1) { // First Class
          totalSeats = 10;
        } else if (classId === 2) { // Second Class
          totalSeats = 20;
        } else if (classId === 3) { // Third Class
          totalSeats = 30;
        } else if (classId === 4) { // Sleeper Class
          totalSeats = 15;
        }
        
        // Insert the compartment
        await client.query(`
          INSERT INTO train_compartments (train_id, class_id, compartment_number, total_seats)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (train_id, compartment_number) DO UPDATE
          SET class_id = $2, total_seats = $4
        `, [train.train_id, classId, i, totalSeats]);
        
        console.log(`  Created compartment ${i} with ${totalSeats} seats for class ID ${classId}`);
      }
    }
    
    // Create seat status entries for all schedules
    const schedulesResult = await client.query(`
      SELECT schedule_id, train_id FROM schedules
    `);
    
    console.log(`Found ${schedulesResult.rows.length} schedules. Creating seat status entries...`);
    
    for (const schedule of schedulesResult.rows) {
      // Get compartments for this train
      const compartmentsResult = await client.query(`
        SELECT compartment_id, total_seats 
        FROM train_compartments 
        WHERE train_id = $1
      `, [schedule.train_id]);
      
      // Create seat status entries for each compartment
      for (const compartment of compartmentsResult.rows) {
        for (let seatNumber = 1; seatNumber <= compartment.total_seats; seatNumber++) {
          await client.query(`
            INSERT INTO seat_status (compartment_id, seat_number, schedule_id, status)
            VALUES ($1, $2, $3, 'available')
            ON CONFLICT (compartment_id, seat_number, schedule_id) DO UPDATE
            SET status = 'available'
          `, [compartment.compartment_id, seatNumber, schedule.schedule_id]);
        }
        
        console.log(`  Created ${compartment.total_seats} seat status entries for compartment ${compartment.compartment_id}, schedule ${schedule.schedule_id}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('Successfully created compartments and seat status entries!');
    
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
    await client.query('ROLLBACK');
    console.error('Error creating compartments:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the function
createCompartments(); 