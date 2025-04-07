require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Successfully connected to the database');
    done();
  }
});

// Routes for Trains
app.get('/api/trains', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM trains');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching trains:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trains', async (req, res) => {
  const { train_name, total_seats, fare_per_km } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO trains (train_name, total_seats, fare_per_km) VALUES ($1, $2, $3) RETURNING *',
      [train_name, total_seats, fare_per_km]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating train:', err);
    res.status(500).json({ error: err.message });
  }
});

// Routes for Stations
app.get('/api/stations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stations');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching stations:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stations', async (req, res) => {
  const { station_name, city } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO stations (station_name, city) VALUES ($1, $2) RETURNING *',
      [station_name, city]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating station:', err);
    res.status(500).json({ error: err.message });
  }
});

// Routes for Schedules
app.get('/api/schedules', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, t.train_name, 
             fs.station_name as from_station_name, 
             ts.station_name as to_station_name
      FROM schedules s
      JOIN trains t ON s.train_id = t.train_id
      JOIN stations fs ON s.from_station = fs.station_id
      JOIN stations ts ON s.to_station = ts.station_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching schedules:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedules', async (req, res) => {
  const { train_id, from_station, to_station, departure_time, arrival_time, distance_km } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO schedules 
       (train_id, from_station, to_station, departure_time, arrival_time, distance_km) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [train_id, from_station, to_station, departure_time, arrival_time, distance_km]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating schedule:', err);
    res.status(500).json({ error: err.message });
  }
});

// Routes for Bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, s.departure_time, s.arrival_time,
             t.train_name, fs.station_name as from_station, 
             ts.station_name as to_station
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN trains t ON s.train_id = t.train_id
      JOIN stations fs ON s.from_station = fs.station_id
      JOIN stations ts ON s.to_station = ts.station_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  const { schedule_id, passenger_name, passenger_age, seat_number } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO bookings 
       (schedule_id, passenger_name, passenger_age, seat_number, booking_date) 
       VALUES ($1, $2, $3, $4, CURRENT_DATE) RETURNING *`,
      [schedule_id, passenger_name, passenger_age, seat_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('Press Ctrl+C to stop the server');
}); 