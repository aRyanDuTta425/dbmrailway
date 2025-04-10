require('dotenv').config();
const { Pool } = require('pg');

// Create a new pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testAdminPanel() {
  try {
    console.log('Testing Admin Panel Functionality...\n');

    // Generate unique names using timestamp
    const timestamp = new Date().getTime();

    // 1. Test adding a new station
    console.log('1. Testing Station Creation:');
    const stationData = {
      station_name: `Test Station ${timestamp}`,
      city: 'Test City',
      state: 'Test State',
      platform_count: 5,
      is_active: true
    };

    const stationResult = await pool.query(`
      INSERT INTO stations (station_name, city, state, platform_count, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [stationData.station_name, stationData.city, stationData.state, stationData.platform_count, stationData.is_active]);

    console.log('Station created:', stationResult.rows[0]);
    const stationId = stationResult.rows[0].station_id;

    // Create another station for the route
    const station2Result = await pool.query(`
      INSERT INTO stations (station_name, city, state, platform_count, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [`Test Station 2 ${timestamp}`, 'Test City 2', 'Test State 2', 4, true]);

    const station2Id = station2Result.rows[0].station_id;
    console.log('Second station created:', station2Result.rows[0]);

    // 2. Test adding a new train
    console.log('\n2. Testing Train Creation:');
    
    // First, get a valid train type
    const trainTypeResult = await pool.query('SELECT type_id FROM train_types LIMIT 1');
    const trainTypeId = trainTypeResult.rows[0].type_id;

    const trainData = {
      train_name: `Test Express ${timestamp}`,
      train_type: trainTypeId,
      total_seats: 500,
      fare_per_km: 2.5,
      is_active: true
    };

    const trainResult = await pool.query(`
      INSERT INTO trains (train_name, train_type, total_seats, fare_per_km, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [trainData.train_name, trainData.train_type, trainData.total_seats, trainData.fare_per_km, trainData.is_active]);

    console.log('Train created:', trainResult.rows[0]);
    const trainId = trainResult.rows[0].train_id;

    // 3. Test creating a schedule for the train
    console.log('\n3. Testing Schedule Creation:');
    
    // Create a route for the train
    const routeResult = await pool.query(
      `INSERT INTO routes (from_station, to_station, distance_km, estimated_duration, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [stationResult.rows[0].station_id, station2Result.rows[0].station_id, 100, 120, true]
    );

    const scheduleData = {
      train_id: trainId,
      route_id: routeResult.rows[0].route_id,
      departure_time: '10:00:00',
      arrival_time: '14:00:00',
      days_of_operation: ['Monday', 'Wednesday', 'Friday'],
      is_active: true
    };

    const scheduleResult = await pool.query(`
      INSERT INTO schedules (train_id, route_id, departure_time, arrival_time, days_of_operation, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      scheduleData.train_id,
      scheduleData.route_id,
      scheduleData.departure_time,
      scheduleData.arrival_time,
      scheduleData.days_of_operation,
      scheduleData.is_active
    ]);

    console.log('Schedule created:', scheduleResult.rows[0]);

    // 4. Test train status
    console.log('\n4. Testing Train Status:');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[new Date().getDay()];

    const trainStatusResult = await pool.query(`
      SELECT 
        t.train_id,
        t.train_name,
        t.is_active,
        tt.type_name,
        COUNT(s.schedule_id) FILTER (WHERE s.departure_time > CURRENT_TIME AND $1 = ANY(s.days_of_operation)) as active_schedules,
        MIN(s.departure_time) FILTER (WHERE s.departure_time > CURRENT_TIME AND $1 = ANY(s.days_of_operation)) as next_departure
      FROM trains t
      JOIN train_types tt ON t.train_type = tt.type_id
      LEFT JOIN schedules s ON t.train_id = s.train_id
      WHERE t.train_id = $2
      GROUP BY t.train_id, t.train_name, t.is_active, tt.type_name
    `, [currentDayName, trainId]);

    console.log('Train status:', trainStatusResult.rows[0]);

    // 5. Clean up test data
    console.log('\n5. Cleaning up test data...');
    await pool.query('DELETE FROM schedules WHERE train_id = $1', [trainId]);
    await pool.query('DELETE FROM routes WHERE route_id = $1', [routeResult.rows[0].route_id]);
    await pool.query('DELETE FROM trains WHERE train_id = $1', [trainId]);
    await pool.query('DELETE FROM stations WHERE station_id IN ($1, $2)', [stationId, station2Id]);

    console.log('Test completed successfully!');
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
    await pool.end();
  }
}

// Run the test
testAdminPanel(); 