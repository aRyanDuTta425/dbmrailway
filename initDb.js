require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDb() {
  const client = await pool.connect();
  try {
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS stations (
        station_id SERIAL PRIMARY KEY,
        station_name VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS trains (
        train_id SERIAL PRIMARY KEY,
        train_name VARCHAR(100) NOT NULL,
        total_seats INTEGER NOT NULL,
        fare_per_km DECIMAL(10,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS schedules (
        schedule_id SERIAL PRIMARY KEY,
        train_id INTEGER REFERENCES trains(train_id),
        from_station INTEGER REFERENCES stations(station_id),
        to_station INTEGER REFERENCES stations(station_id),
        departure_time TIME NOT NULL,
        arrival_time TIME NOT NULL,
        distance_km INTEGER NOT NULL,
        UNIQUE(train_id, from_station, to_station, departure_time)
      );

      CREATE TABLE IF NOT EXISTS bookings (
        booking_id SERIAL PRIMARY KEY,
        schedule_id INTEGER REFERENCES schedules(schedule_id),
        passenger_name VARCHAR(100) NOT NULL,
        passenger_age INTEGER NOT NULL,
        seat_number INTEGER NOT NULL,
        booking_date DATE NOT NULL,
        UNIQUE(schedule_id, seat_number)
      );
    `);

    // Insert sample data
    await client.query(`
      INSERT INTO stations (station_name, city) VALUES
      ('Central Station', 'Mumbai'),
      ('New Delhi Station', 'Delhi'),
      ('Chennai Central', 'Chennai'),
      ('Howrah Station', 'Kolkata')
      ON CONFLICT DO NOTHING;

      INSERT INTO trains (train_name, total_seats, fare_per_km) VALUES
      ('Rajdhani Express', 500, 2.5),
      ('Shatabdi Express', 300, 3.0),
      ('Duronto Express', 400, 2.8)
      ON CONFLICT DO NOTHING;
    `);

    console.log('Database initialized successfully!');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
    pool.end();
  }
}

initDb(); 