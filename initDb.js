require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop existing tables if they exist
    await client.query(`
      DROP TABLE IF EXISTS maintenance_records CASCADE;
      DROP TABLE IF EXISTS bookings CASCADE;
      DROP TABLE IF EXISTS seat_status CASCADE;
      DROP TABLE IF EXISTS schedules CASCADE;
      DROP TABLE IF EXISTS routes CASCADE;
      DROP TABLE IF EXISTS train_compartments CASCADE;
      DROP TABLE IF EXISTS train_classes CASCADE;
      DROP TABLE IF EXISTS trains CASCADE;
      DROP TABLE IF EXISTS stations CASCADE;
      DROP TABLE IF EXISTS train_types CASCADE;
    `);

    // Create train_types table
    await client.query(`
      CREATE TABLE train_types (
        type_id SERIAL PRIMARY KEY,
        type_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        base_fare_per_km DECIMAL(10,2) NOT NULL
      )
    `);

    // Create stations table
    await client.query(`
      CREATE TABLE stations (
        station_id SERIAL PRIMARY KEY,
        station_name VARCHAR(100) UNIQUE NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        platform_count INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create trains table
    await client.query(`
      CREATE TABLE trains (
        train_id SERIAL PRIMARY KEY,
        train_name VARCHAR(100) UNIQUE NOT NULL,
        train_type INTEGER REFERENCES train_types(type_id),
        total_seats INTEGER NOT NULL,
        fare_per_km DECIMAL(10,2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        maintenance_status VARCHAR(50) DEFAULT 'operational',
        last_maintenance_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create train_classes table
    await client.query(`
      CREATE TABLE train_classes (
        class_id SERIAL PRIMARY KEY,
        class_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        fare_multiplier DECIMAL(10,2) NOT NULL
      )
    `);

    // Create train_compartments table
    await client.query(`
      CREATE TABLE train_compartments (
        compartment_id SERIAL PRIMARY KEY,
        train_id INTEGER REFERENCES trains(train_id),
        class_id INTEGER REFERENCES train_classes(class_id),
        compartment_number VARCHAR(10) NOT NULL,
        total_seats INTEGER NOT NULL,
        UNIQUE(train_id, compartment_number)
      )
    `);

    // Create routes table
    await client.query(`
      CREATE TABLE routes (
        route_id SERIAL PRIMARY KEY,
        from_station INTEGER REFERENCES stations(station_id),
        to_station INTEGER REFERENCES stations(station_id),
        distance_km INTEGER NOT NULL,
        estimated_duration INTERVAL NOT NULL,
        is_active BOOLEAN DEFAULT true,
        UNIQUE(from_station, to_station)
      )
    `);

    // Create schedules table
    await client.query(`
      CREATE TABLE schedules (
        schedule_id SERIAL PRIMARY KEY,
        train_id INTEGER REFERENCES trains(train_id),
        route_id INTEGER REFERENCES routes(route_id),
        departure_time TIME NOT NULL,
        arrival_time TIME NOT NULL,
        days_of_operation TEXT[] NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create seat_status table
    await client.query(`
      CREATE TABLE seat_status (
        status_id SERIAL PRIMARY KEY,
        compartment_id INTEGER REFERENCES train_compartments(compartment_id),
        schedule_id INTEGER REFERENCES schedules(schedule_id),
        seat_number INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL,
        UNIQUE(compartment_id, schedule_id, seat_number)
      )
    `);

    // Create bookings table
    await client.query(`
      CREATE TABLE bookings (
        booking_id SERIAL PRIMARY KEY,
        schedule_id INTEGER REFERENCES schedules(schedule_id),
        compartment_id INTEGER REFERENCES train_compartments(compartment_id),
        seat_number INTEGER NOT NULL,
        passenger_name VARCHAR(100) NOT NULL,
        passenger_age INTEGER NOT NULL,
        passenger_gender VARCHAR(10) NOT NULL,
        booking_status VARCHAR(20) NOT NULL,
        booking_date DATE NOT NULL,
        fare_amount DECIMAL(10,2) NOT NULL,
        payment_status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create maintenance_records table
    await client.query(`
      CREATE TABLE maintenance_records (
        record_id SERIAL PRIMARY KEY,
        train_id INTEGER REFERENCES trains(train_id),
        maintenance_type VARCHAR(50) NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE,
        cost DECIMAL(10,2),
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('Database schema initialized successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing database schema:', err);
  } finally {
    client.release();
  }
}

initializeDatabase(); 