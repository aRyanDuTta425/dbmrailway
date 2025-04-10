require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Predefined data
const trainTypes = [
  { type_name: 'Express', description: 'Fast trains with limited stops', base_fare_per_km: 2.5 },
  { type_name: 'Superfast', description: 'High-speed trains with premium services', base_fare_per_km: 3.0 },
  { type_name: 'Local', description: 'Regular trains with frequent stops', base_fare_per_km: 1.5 },
  { type_name: 'Luxury', description: 'Premium trains with first-class amenities', base_fare_per_km: 4.0 }
];

const stations = [
  { station_name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra', platform_count: 12 },
  { station_name: 'New Delhi', city: 'Delhi', state: 'Delhi', platform_count: 16 },
  { station_name: 'Chennai Central', city: 'Chennai', state: 'Tamil Nadu', platform_count: 10 },
  { station_name: 'Kolkata', city: 'Kolkata', state: 'West Bengal', platform_count: 15 },
  { station_name: 'Bangalore City', city: 'Bangalore', state: 'Karnataka', platform_count: 8 }
];

const trainClasses = [
  { class_name: 'First Class', description: 'Luxury seating with premium services', fare_multiplier: 2.0 },
  { class_name: 'Second Class', description: 'Comfortable seating with basic amenities', fare_multiplier: 1.5 },
  { class_name: 'Third Class', description: 'Standard seating', fare_multiplier: 1.0 },
  { class_name: 'Sleeper Class', description: 'Basic sleeping arrangements', fare_multiplier: 1.2 }
];

const trains = [
  { train_name: 'Rajdhani Express', train_type: 'Express', total_seats: 500, fare_per_km: 2.5 },
  { train_name: 'Shatabdi Express', train_type: 'Superfast', total_seats: 300, fare_per_km: 3.0 },
  { train_name: 'Duronto Express', train_type: 'Superfast', total_seats: 400, fare_per_km: 2.8 },
  { train_name: 'Garib Rath', train_type: 'Local', total_seats: 600, fare_per_km: 1.5 },
  { train_name: 'Palace on Wheels', train_type: 'Luxury', total_seats: 200, fare_per_km: 4.0 },
  { train_name: 'Deccan Queen', train_type: 'Express', total_seats: 450, fare_per_km: 2.6 },
  { train_name: 'August Kranti', train_type: 'Superfast', total_seats: 550, fare_per_km: 2.7 },
  { train_name: 'Golden Temple Mail', train_type: 'Express', total_seats: 480, fare_per_km: 2.4 },
  { train_name: 'Konkan Kanya', train_type: 'Local', total_seats: 520, fare_per_km: 1.8 },
  { train_name: 'Maharaja Express', train_type: 'Luxury', total_seats: 180, fare_per_km: 4.2 },
  { train_name: 'Vande Bharat Express', train_type: 'Superfast', total_seats: 350, fare_per_km: 3.2 },
  { train_name: 'Gatimaan Express', train_type: 'Superfast', total_seats: 400, fare_per_km: 3.1 },
  { train_name: 'Tejas Express', train_type: 'Superfast', total_seats: 450, fare_per_km: 2.9 },
  { train_name: 'Humsafar Express', train_type: 'Express', total_seats: 550, fare_per_km: 2.3 },
  { train_name: 'Antyodaya Express', train_type: 'Local', total_seats: 700, fare_per_km: 1.4 },
  { train_name: 'Uday Express', train_type: 'Superfast', total_seats: 400, fare_per_km: 2.8 },
  { train_name: 'Rani Chennamma', train_type: 'Express', total_seats: 500, fare_per_km: 2.5 },
  { train_name: 'Karnataka Express', train_type: 'Express', total_seats: 480, fare_per_km: 2.4 },
  { train_name: 'Mysore Express', train_type: 'Local', total_seats: 550, fare_per_km: 1.7 },
  { train_name: 'Chennai Express', train_type: 'Superfast', total_seats: 450, fare_per_km: 2.9 },
  { train_name: 'Coromandel Express', train_type: 'Express', total_seats: 520, fare_per_km: 2.5 },
  { train_name: 'Howrah Express', train_type: 'Superfast', total_seats: 480, fare_per_km: 2.8 }
];

async function seedDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert train types
    for (const type of trainTypes) {
      await client.query(
        'INSERT INTO train_types (type_name, description, base_fare_per_km) VALUES ($1, $2, $3) ON CONFLICT (type_name) DO NOTHING',
        [type.type_name, type.description, type.base_fare_per_km]
      );
    }

    // Insert stations
    for (const station of stations) {
      await client.query(
        'INSERT INTO stations (station_name, city, state, platform_count) VALUES ($1, $2, $3, $4) ON CONFLICT (station_name) DO NOTHING',
        [station.station_name, station.city, station.state, station.platform_count]
      );
    }

    // Insert train classes
    for (const trainClass of trainClasses) {
      await client.query(
        'INSERT INTO train_classes (class_name, description, fare_multiplier) VALUES ($1, $2, $3) ON CONFLICT (class_name) DO NOTHING',
        [trainClass.class_name, trainClass.description, trainClass.fare_multiplier]
      );
    }

    // Get train type IDs
    const trainTypeResult = await client.query('SELECT type_id, type_name FROM train_types');
    const trainTypeMap = new Map(trainTypeResult.rows.map(row => [row.type_name, row.type_id]));

    // Insert trains
    for (const train of trains) {
      await client.query(
        'INSERT INTO trains (train_name, train_type, total_seats, fare_per_km) VALUES ($1, $2, $3, $4) ON CONFLICT (train_name) DO NOTHING',
        [train.train_name, trainTypeMap.get(train.train_type), train.total_seats, train.fare_per_km]
      );
    }

    // Get train IDs
    const trainResult = await client.query('SELECT train_id, train_name FROM trains');
    const trainMap = new Map(trainResult.rows.map(row => [row.train_name, row.train_id]));

    // Create routes between major stations
    const stationResult = await client.query('SELECT station_id, station_name FROM stations');
    const stationMap = new Map(stationResult.rows.map(row => [row.station_name, row.station_id]));

    // Create routes between major cities
    const majorRoutes = [
      // Mumbai Central routes (both directions)
      { from: 'Mumbai Central', to: 'New Delhi', distance: 1384, duration: '16:00:00' },
      { from: 'New Delhi', to: 'Mumbai Central', distance: 1384, duration: '16:00:00' },
      
      { from: 'Mumbai Central', to: 'Chennai Central', distance: 1298, duration: '20:00:00' },
      { from: 'Chennai Central', to: 'Mumbai Central', distance: 1298, duration: '20:00:00' },
      
      { from: 'Mumbai Central', to: 'Kolkata', distance: 1930, duration: '24:00:00' },
      { from: 'Kolkata', to: 'Mumbai Central', distance: 1930, duration: '24:00:00' },
      
      { from: 'Mumbai Central', to: 'Bangalore City', distance: 983, duration: '16:00:00' },
      { from: 'Bangalore City', to: 'Mumbai Central', distance: 983, duration: '16:00:00' },
      
      // New Delhi routes (both directions)
      { from: 'New Delhi', to: 'Chennai Central', distance: 2180, duration: '28:00:00' },
      { from: 'Chennai Central', to: 'New Delhi', distance: 2180, duration: '28:00:00' },
      
      { from: 'New Delhi', to: 'Kolkata', distance: 1454, duration: '17:00:00' },
      { from: 'Kolkata', to: 'New Delhi', distance: 1454, duration: '17:00:00' },
      
      { from: 'New Delhi', to: 'Bangalore City', distance: 2150, duration: '32:00:00' },
      { from: 'Bangalore City', to: 'New Delhi', distance: 2150, duration: '32:00:00' },
      
      // Chennai Central routes (both directions)
      { from: 'Chennai Central', to: 'Kolkata', distance: 1659, duration: '26:00:00' },
      { from: 'Kolkata', to: 'Chennai Central', distance: 1659, duration: '26:00:00' },
      
      { from: 'Chennai Central', to: 'Bangalore City', distance: 362, duration: '06:00:00' },
      { from: 'Bangalore City', to: 'Chennai Central', distance: 362, duration: '06:00:00' },
      
      // Kolkata routes (both directions)
      { from: 'Kolkata', to: 'Bangalore City', distance: 1920, duration: '30:00:00' },
      { from: 'Bangalore City', to: 'Kolkata', distance: 1920, duration: '30:00:00' }
    ];

    for (const route of majorRoutes) {
      await client.query(
        'INSERT INTO routes (from_station, to_station, distance_km, estimated_duration) VALUES ($1, $2, $3, $4) ON CONFLICT (from_station, to_station) DO NOTHING',
        [stationMap.get(route.from), stationMap.get(route.to), route.distance, route.duration]
      );
    }

    // Get route IDs
    const routeResult = await client.query(`
      SELECT r.route_id, fs.station_name as from_station, ts.station_name as to_station
      FROM routes r
      JOIN stations fs ON r.from_station = fs.station_id
      JOIN stations ts ON r.to_station = ts.station_id
    `);
    const routeMap = new Map(routeResult.rows.map(row => [`${row.from_station}-${row.to_station}`, row.route_id]));

    // Create schedules for each route
    const schedules = [
      // Mumbai Central routes
      {
        train: 'Rajdhani Express',
        route: 'Mumbai Central-New Delhi',
        departure: '16:00',
        arrival: '08:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Vande Bharat Express',
        route: 'New Delhi-Mumbai Central',
        departure: '16:30',
        arrival: '08:30',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Deccan Queen',
        route: 'Mumbai Central-Chennai Central',
        departure: '08:00',
        arrival: '04:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Chennai Express',
        route: 'Chennai Central-Mumbai Central',
        departure: '09:00',
        arrival: '05:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'August Kranti',
        route: 'Mumbai Central-Kolkata',
        departure: '20:00',
        arrival: '20:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Howrah Express',
        route: 'Kolkata-Mumbai Central',
        departure: '21:00',
        arrival: '21:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Konkan Kanya',
        route: 'Mumbai Central-Bangalore City',
        departure: '22:00',
        arrival: '14:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Karnataka Express',
        route: 'Bangalore City-Mumbai Central',
        departure: '23:00',
        arrival: '15:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      
      // New Delhi routes
      {
        train: 'Shatabdi Express',
        route: 'New Delhi-Chennai Central',
        departure: '06:00',
        arrival: '10:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Gatimaan Express',
        route: 'Chennai Central-New Delhi',
        departure: '07:00',
        arrival: '11:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Duronto Express',
        route: 'New Delhi-Kolkata',
        departure: '22:00',
        arrival: '15:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Humsafar Express',
        route: 'Kolkata-New Delhi',
        departure: '23:00',
        arrival: '16:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Rajdhani Express',
        route: 'New Delhi-Bangalore City',
        departure: '16:00',
        arrival: '00:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Rani Chennamma',
        route: 'Bangalore City-New Delhi',
        departure: '17:00',
        arrival: '01:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      
      // Chennai Central routes
      {
        train: 'Coromandel Express',
        route: 'Chennai Central-Kolkata',
        departure: '20:00',
        arrival: '22:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Antyodaya Express',
        route: 'Kolkata-Chennai Central',
        departure: '21:00',
        arrival: '23:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Shatabdi Express',
        route: 'Chennai Central-Bangalore City',
        departure: '06:00',
        arrival: '12:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Mysore Express',
        route: 'Bangalore City-Chennai Central',
        departure: '07:00',
        arrival: '13:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      
      // Kolkata routes
      {
        train: 'Tejas Express',
        route: 'Kolkata-Bangalore City',
        departure: '18:00',
        arrival: '00:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      {
        train: 'Uday Express',
        route: 'Bangalore City-Kolkata',
        departure: '19:00',
        arrival: '01:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      }
    ];

    // Add debug logging to check route mapping
    console.log('Route map keys:', Array.from(routeMap.keys()));
    
    for (const schedule of schedules) {
      const routeKey = schedule.route;
      const trainId = trainMap.get(schedule.train);
      const routeId = routeMap.get(routeKey);
      
      console.log(`Processing schedule: ${schedule.train} on route ${routeKey}`);
      console.log(`Train ID: ${trainId}, Route ID: ${routeId}`);
      
      if (!trainId) {
        console.error(`Train not found: ${schedule.train}`);
        continue;
      }
      
      if (!routeId) {
        console.error(`Route not found: ${routeKey}`);
        continue;
      }
      
      await client.query(
        'INSERT INTO schedules (train_id, route_id, departure_time, arrival_time, days_of_operation) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
        [
          trainId,
          routeId,
          schedule.departure,
          schedule.arrival,
          schedule.days
        ]
      );
    }

    await client.query('COMMIT');
    console.log('Database seeded successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', err);
  } finally {
    client.release();
  }
}

seedDatabase(); 