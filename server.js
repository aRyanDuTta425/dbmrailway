require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Root route redirection
app.get('/', (req, res) => {
  res.redirect('/views/admin/index.html');
});

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
console.log('Initializing database connection...');
console.log('Database URL:', process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    console.error('Error stack:', err.stack);
  } else {
    console.log('Successfully connected to the database');
    done();
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Fare calculation endpoint
app.get('/api/schedules/:id/fare', async (req, res) => {
  const { compartment_id } = req.query;
  
  if (!compartment_id) {
    return res.status(400).json({ error: 'Compartment ID is required' });
  }

  try {
    const fareResult = await pool.query(`
      SELECT 
        r.distance_km,
        t.fare_per_km,
        tc2.fare_multiplier,
        (r.distance_km * t.fare_per_km * tc2.fare_multiplier) as total_fare
      FROM schedules s
      JOIN routes r ON s.route_id = r.route_id
      JOIN trains t ON s.train_id = t.train_id
      JOIN train_compartments tc ON tc.train_id = t.train_id AND tc.compartment_id = $2
      JOIN train_classes tc2 ON tc.class_id = tc2.class_id
      WHERE s.schedule_id = $1
    `, [req.params.id, compartment_id]);

    if (fareResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fare information not found' });
    }

    res.json({ total_fare: fareResult.rows[0].total_fare });
  } catch (err) {
    console.error('Error calculating fare:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add dayNames array at the top of the file with other constants
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Train routes with advanced queries
app.get('/api/trains', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, tt.type_name, tt.description as type_description
      FROM trains t
      JOIN train_types tt ON t.train_type = tt.type_id
      WHERE t.is_active = true
      ORDER BY t.train_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching trains:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/trains/:id/compartments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tc.*, tc2.class_name, tc2.description as class_description
      FROM train_compartments tc
      JOIN train_classes tc2 ON tc.class_id = tc2.class_id
      WHERE tc.train_id = $1
      ORDER BY tc.compartment_number
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching train compartments:', err);
    res.status(500).json({ error: err.message });
  }
});

// Station routes with advanced queries
app.get('/api/stations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM stations
      WHERE is_active = true
      ORDER BY city, station_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching stations:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stations/search', async (req, res) => {
  const { city, state } = req.query;
  try {
    let query = 'SELECT * FROM stations WHERE is_active = true';
    const params = [];
    let paramCount = 1;

    if (city) {
      query += ` AND city ILIKE $${paramCount}`;
      params.push(`%${city}%`);
      paramCount++;
    }

    if (state) {
      query += ` AND state ILIKE $${paramCount}`;
      params.push(`%${state}%`);
      paramCount++;
    }

    query += ' ORDER BY city, station_name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error searching stations:', err);
    res.status(500).json({ error: err.message });
  }
});

// Route management
app.get('/api/routes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, 
             fs.station_name as from_station_name,
             ts.station_name as to_station_name
      FROM routes r
      JOIN stations fs ON r.from_station = fs.station_id
      JOIN stations ts ON r.to_station = ts.station_id
      WHERE r.is_active = true
      ORDER BY fs.station_name, ts.station_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching routes:', err);
    res.status(500).json({ error: err.message });
  }
});

// Schedule management with advanced queries
app.get('/api/schedules', async (req, res) => {
  const { train_id, from_station, to_station } = req.query;
  try {
    let query = `
      SELECT DISTINCT ON (t.train_id, r.route_id)
        s.schedule_id,
        s.departure_time,
        s.arrival_time,
        s.days_of_operation,
        s.is_active,
        t.train_id,
        t.train_name,
        fs.station_name as from_station_name,
        ts.station_name as to_station_name,
        r.route_id,
        r.distance_km,
        tt.type_name as train_type
      FROM schedules s
      JOIN trains t ON s.train_id = t.train_id
      JOIN train_types tt ON t.train_type = tt.type_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN stations fs ON r.from_station = fs.station_id
      JOIN stations ts ON r.to_station = ts.station_id
      WHERE s.is_active = true
      AND t.is_active = true
      AND r.is_active = true
    `;
    const params = [];
    let paramCount = 1;

    if (train_id) {
      query += ` AND s.train_id = $${paramCount}`;
      params.push(train_id);
      paramCount++;
    }

    if (from_station) {
      query += ` AND fs.station_id = $${paramCount}`;
      params.push(from_station);
      paramCount++;
    }

    if (to_station) {
      query += ` AND ts.station_id = $${paramCount}`;
      params.push(to_station);
      paramCount++;
    }

    query += ` ORDER BY t.train_id, r.route_id, s.departure_time`;
               
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching schedules:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/schedules/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, t.train_name, 
             fs.station_name as from_station_name,
             ts.station_name as to_station_name,
             fs.station_id as from_station,
             ts.station_id as to_station
      FROM schedules s
      JOIN trains t ON s.train_id = t.train_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN stations fs ON r.from_station = fs.station_id
      JOIN stations ts ON r.to_station = ts.station_id
      WHERE s.schedule_id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching schedule:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to ensure seat status entries exist for a schedule
async function ensureSeatStatusEntries(scheduleId, trainId) {
  try {
    console.log(`Ensuring seat status entries for schedule ${scheduleId} and train ${trainId}`);
    
    // Get all compartments for this train
    console.log('Querying train compartments...');
    const compartmentsResult = await pool.query(
      `SELECT tc.compartment_id, tc.total_seats, tc.compartment_number 
       FROM train_compartments tc 
       WHERE tc.train_id = $1`,
      [trainId]
    );
    console.log('Train compartments query result:', compartmentsResult.rows);
    
    if (compartmentsResult.rows.length === 0) {
      console.log(`No compartments found for train ${trainId}. Creating default compartments...`);
      
      // Create default compartments for the train
      const classesResult = await pool.query('SELECT class_id FROM train_classes');
      if (classesResult.rows.length === 0) {
        console.log('No train classes found');
        return false;
      }
      
      // Create one compartment for each class
      let compartmentNumber = 1;
      for (const classRow of classesResult.rows) {
        await pool.query(
          `INSERT INTO train_compartments 
           (train_id, compartment_number, class_id, total_seats) 
           VALUES ($1, $2, $3, $4)`,
          [trainId, compartmentNumber++, classRow.class_id, 10]
        );
      }
      
      // Query compartments again
      const newCompartmentsResult = await pool.query(
        `SELECT tc.compartment_id, tc.total_seats, tc.compartment_number 
         FROM train_compartments tc 
         WHERE tc.train_id = $1`,
        [trainId]
      );
      console.log('Created default compartments:', newCompartmentsResult.rows);
      
      if (newCompartmentsResult.rows.length === 0) {
        console.log('Failed to create default compartments');
        return false;
      }
      
      // Use the new compartments
      compartmentsResult.rows = newCompartmentsResult.rows;
    }
    
    // For each compartment, ensure seat status entries exist
    for (const compartment of compartmentsResult.rows) {
      console.log(`Processing compartment ${compartment.compartment_id} (${compartment.compartment_number})`);
      for (let seatNumber = 1; seatNumber <= compartment.total_seats; seatNumber++) {
        // Check if seat status entry exists
        const statusCheck = await pool.query(
          `SELECT * FROM seat_status 
           WHERE compartment_id = $1 AND seat_number = $2 AND schedule_id = $3`,
          [compartment.compartment_id, seatNumber, scheduleId]
        );
        
        // If not, create it
        if (statusCheck.rows.length === 0) {
          console.log(`Creating seat status for compartment ${compartment.compartment_id}, seat ${seatNumber}`);
          await pool.query(
            `INSERT INTO seat_status (compartment_id, seat_number, schedule_id, status) 
             VALUES ($1, $2, $3, 'available')`,
            [compartment.compartment_id, seatNumber, scheduleId]
          );
        }
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error ensuring seat status entries:', err);
    console.error('Error stack:', err.stack);
    return false;
  }
}

// Helper function to check if a schedule exists and create it if it doesn't
async function ensureScheduleExists(scheduleId) {
  try {
    console.log(`Checking if schedule ${scheduleId} exists`);
    
    // Check if the schedule exists
    const scheduleResult = await pool.query(
      'SELECT * FROM schedules WHERE schedule_id = $1',
      [scheduleId]
    );
    
    if (scheduleResult.rows.length === 0) {
      console.log(`Schedule ${scheduleId} not found, creating it`);
      
      // Get a random train and route to create the schedule
      const trainResult = await pool.query(
        'SELECT train_id FROM trains WHERE is_active = true ORDER BY RANDOM() LIMIT 1'
      );
      
      if (trainResult.rows.length === 0) {
        console.log('No active trains found');
        return false;
      }
      
      const trainId = trainResult.rows[0].train_id;
      
      const routeResult = await pool.query(
        'SELECT route_id FROM routes WHERE is_active = true ORDER BY RANDOM() LIMIT 1'
      );
      
      if (routeResult.rows.length === 0) {
        console.log('No active routes found');
        return false;
      }
      
      const routeId = routeResult.rows[0].route_id;
      
      // Create the schedule
      await pool.query(
        `INSERT INTO schedules (
          schedule_id, train_id, route_id, departure_time, arrival_time, 
          days_of_operation, is_active
        ) VALUES ($1, $2, $3, '08:00:00', '12:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], true)`,
        [scheduleId, trainId, routeId]
      );
      
      console.log(`Created schedule ${scheduleId} for train ${trainId} and route ${routeId}`);
      return true;
    }
    
    console.log(`Schedule ${scheduleId} exists`);
    return true;
  } catch (err) {
    console.error('Error ensuring schedule exists:', err);
    return false;
  }
}

// Get seat availability for a schedule
app.get('/api/schedules/:id/seats', async (req, res) => {
  try {
    console.log('Fetching seats for schedule:', req.params.id);
    
    // Ensure the schedule exists
    const scheduleExists = await ensureScheduleExists(req.params.id);
    if (!scheduleExists) {
      console.log('Failed to ensure schedule exists:', req.params.id);
      return res.status(404).json({ error: 'Schedule not found and could not be created' });
    }
    
    // First get the train_id for this schedule
    const trainResult = await pool.query(
      'SELECT train_id FROM schedules WHERE schedule_id = $1',
      [req.params.id]
    );

    if (trainResult.rows.length === 0) {
      console.log('Schedule not found:', req.params.id);
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const trainId = trainResult.rows[0].train_id;
    console.log('Found train_id:', trainId);
    
    // Ensure seat status entries exist
    const seatStatusCreated = await ensureSeatStatusEntries(req.params.id, trainId);
    if (!seatStatusCreated) {
      console.log('Failed to create seat status entries for schedule:', req.params.id);
      return res.status(500).json({ error: 'Failed to create seat status entries' });
    }

    // Get all compartments for this train with their class information
    const compartmentsResult = await pool.query(
      `SELECT tc.compartment_id, tc.compartment_number, tc.total_seats, tc.class_id, tc2.class_name 
       FROM train_compartments tc 
       JOIN train_classes tc2 ON tc.class_id = tc2.class_id 
       WHERE tc.train_id = $1 
       ORDER BY tc.compartment_number`,
      [trainId]
    );
    console.log('Found compartments:', compartmentsResult.rows.length);

    if (compartmentsResult.rows.length === 0) {
      console.log('No compartments found for train:', trainId);
      return res.status(404).json({ error: 'No compartments found for this train' });
    }

    // Get booked seats for this schedule
    const bookedSeatsResult = await pool.query(
      `SELECT compartment_id, seat_number 
       FROM bookings 
       WHERE schedule_id = $1 AND booking_status = 'confirmed'`,
      [req.params.id]
    );
    console.log('Found booked seats:', bookedSeatsResult.rows.length);

    // Create a set of booked seats for quick lookup
    const bookedSeats = new Set(
      bookedSeatsResult.rows.map(row => `${row.compartment_id}-${row.seat_number}`)
    );

    // Generate seats for each compartment
    const seats = [];
    for (const compartment of compartmentsResult.rows) {
      for (let seatNumber = 1; seatNumber <= compartment.total_seats; seatNumber++) {
        const isBooked = bookedSeats.has(`${compartment.compartment_id}-${seatNumber}`);
        seats.push({
          seat_number: seatNumber,
          compartment_id: compartment.compartment_id,
          compartment_number: compartment.compartment_number,
          class_id: compartment.class_id,
          class_name: compartment.class_name,
          is_booked: isBooked,
          status: isBooked ? 'booked' : 'available'
        });
      }
    }
    console.log('Generated total seats:', seats.length);
    res.json(seats);
  } catch (err) {
    console.error('Error fetching seats:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  const { schedule_id, compartment_id, seat_number, passenger_name, passenger_age, passenger_gender } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if seat is already booked
    const seatCheck = await client.query(
      'SELECT * FROM bookings WHERE schedule_id = $1 AND compartment_id = $2 AND seat_number = $3 AND booking_status = \'confirmed\'',
      [schedule_id, compartment_id, seat_number]
    );

    if (seatCheck.rows.length > 0) {
      throw new Error('Seat is already booked');
    }

    // Get train_id for this schedule
    const trainResult = await client.query(
      'SELECT train_id FROM schedules WHERE schedule_id = $1',
      [schedule_id]
    );

    if (trainResult.rows.length === 0) {
      throw new Error('Schedule not found');
    }

    const trainId = trainResult.rows[0].train_id;

    // Ensure seat status entry exists
    const statusCheck = await client.query(
      'SELECT * FROM seat_status WHERE compartment_id = $1 AND seat_number = $2 AND schedule_id = $3',
      [compartment_id, seat_number, schedule_id]
    );

    if (statusCheck.rows.length === 0) {
      // Create seat status entry
      await client.query(
        'INSERT INTO seat_status (compartment_id, seat_number, schedule_id, status) VALUES ($1, $2, $3, \'available\')',
        [compartment_id, seat_number, schedule_id]
      );
      console.log(`Created seat status entry for compartment ${compartment_id}, seat ${seat_number}, schedule ${schedule_id}`);
    }

    // Get fare information
    const fareInfo = await client.query(`
      SELECT r.distance_km, tc2.fare_multiplier, t.fare_per_km
      FROM schedules s
      JOIN routes r ON s.route_id = r.route_id
      JOIN train_compartments tc ON tc.train_id = s.train_id
      JOIN train_classes tc2 ON tc.class_id = tc2.class_id
      JOIN trains t ON s.train_id = t.train_id
      WHERE s.schedule_id = $1 AND tc.compartment_id = $2
    `, [schedule_id, compartment_id]);

    if (fareInfo.rows.length === 0) {
      throw new Error('Could not calculate fare information');
    }

    const fare = fareInfo.rows[0].distance_km * fareInfo.rows[0].fare_multiplier * fareInfo.rows[0].fare_per_km;

    // Create booking
    const bookingResult = await client.query(
      `INSERT INTO bookings 
       (schedule_id, compartment_id, seat_number, passenger_name, 
        passenger_age, passenger_gender, booking_status, booking_date, 
        fare_amount, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, $9)
       RETURNING *`,
      [schedule_id, compartment_id, seat_number, passenger_name,
       passenger_age, passenger_gender, 'confirmed', fare, 'pending']
    );

    // Update seat status
    await client.query(
      'UPDATE seat_status SET status = \'booked\' WHERE compartment_id = $1 AND seat_number = $2 AND schedule_id = $3',
      [compartment_id, seat_number, schedule_id]
    );

    await client.query('COMMIT');
    res.status(201).json(bookingResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating booking:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get all bookings for admin
app.get('/api/admin/bookings', async (req, res) => {
  try {
    const { search, status, date } = req.query;
    let query = `
      SELECT b.*, t.train_name, 
             fs.station_name as from_station_name,
             ts.station_name as to_station_name,
             s.departure_time, s.arrival_time
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN trains t ON s.train_id = t.train_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN stations fs ON r.from_station = fs.station_id
      JOIN stations ts ON r.to_station = ts.station_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (b.booking_id::text LIKE $${paramCount} OR b.passenger_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      query += ` AND b.booking_status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (date) {
      query += ` AND b.booking_date = $${paramCount}`;
      params.push(date);
      paramCount++;
    }

    query += ` ORDER BY b.booking_date DESC, b.booking_id DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching admin bookings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a single booking by ID for admin
app.get('/api/admin/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT b.*, t.train_name, 
             fs.station_name as from_station_name,
             ts.station_name as to_station_name,
             s.departure_time, s.arrival_time
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN trains t ON s.train_id = t.train_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN stations fs ON r.from_station = fs.station_id
      JOIN stations ts ON r.to_station = ts.station_id
      WHERE b.booking_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching admin booking:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update booking status for admin
app.put('/api/admin/bookings/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE bookings SET booking_status = $1 WHERE booking_id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating booking status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Maintenance management
app.get('/api/maintenance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, t.train_name
      FROM maintenance_records m
      JOIN trains t ON m.train_id = t.train_id
      ORDER BY m.start_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching maintenance records:', err);
    res.status(500).json({ error: err.message });
  }
});

// Train Management API Endpoints
app.get('/api/train-types', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM train_types ORDER BY type_name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching train types:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trains', async (req, res) => {
  const { 
    train_name, 
    train_type, 
    total_seats, 
    fare_per_km, 
    is_active,
    source_station,
    destination_station,
    departure_time,
    arrival_time,
    days_of_operation
  } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create the train
    const trainResult = await client.query(
      'INSERT INTO trains (train_name, train_type, total_seats, fare_per_km, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [train_name, train_type, total_seats, fare_per_km, is_active]
    );
    const train = trainResult.rows[0];

    // Get or create the route
    let routeResult = await client.query(
      'SELECT * FROM routes WHERE from_station = $1 AND to_station = $2 AND is_active = true',
      [source_station, destination_station]
    );

    let routeId;
    if (routeResult.rows.length === 0) {
      // Create a new route if it doesn't exist
      const newRouteResult = await client.query(
        'INSERT INTO routes (from_station, to_station, is_active) VALUES ($1, $2, true) RETURNING *',
        [source_station, destination_station]
      );
      routeId = newRouteResult.rows[0].route_id;
    } else {
      routeId = routeResult.rows[0].route_id;
    }

    // Create the schedule
    const scheduleResult = await client.query(
      `INSERT INTO schedules (
        train_id, 
        route_id, 
        departure_time, 
        arrival_time, 
        days_of_operation, 
        is_active
      ) VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
      [train.train_id, routeId, departure_time, arrival_time, days_of_operation]
    );

    await client.query('COMMIT');
    res.status(201).json({
      train: train,
      schedule: scheduleResult.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating train:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.put('/api/trains/:id', async (req, res) => {
  const { train_name, train_type, total_seats, fare_per_km, is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE trains SET train_name = $1, train_type = $2, total_seats = $3, fare_per_km = $4, is_active = $5 WHERE train_id = $6 RETURNING *',
      [train_name, train_type, total_seats, fare_per_km, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Train not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating train:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/trains/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First, delete all schedules associated with this train
    await client.query('DELETE FROM schedules WHERE train_id = $1', [req.params.id]);

    // Then delete the train
    const result = await client.query('DELETE FROM trains WHERE train_id = $1 RETURNING *', [req.params.id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Train not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Train and associated schedules deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting train:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Station Management API Endpoints
app.post('/api/stations', async (req, res) => {
  const { station_name, city, state, platform_count, is_active } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO stations (station_name, city, state, platform_count, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [station_name, city, state, platform_count, is_active]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating station:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/stations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { station_name, city, state, platform_count, is_active } = req.body;
    
    // First check if the station exists
    const existingStation = await pool.query(
      'SELECT * FROM stations WHERE station_id = $1',
      [id]
    );
    
    if (existingStation.rows.length === 0) {
      return res.status(404).json({ error: 'Station not found' });
    }
    
    // If name and city are being changed, check for conflicts
    if (station_name !== existingStation.rows[0].station_name || 
        city !== existingStation.rows[0].city) {
      const conflictCheck = await pool.query(
        'SELECT * FROM stations WHERE station_name = $1 AND city = $2 AND station_id != $3',
        [station_name, city, id]
      );
      
      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({ 
          error: 'A station with this name already exists in this city' 
        });
      }
    }
    
    // Update the station
    const result = await pool.query(`
      UPDATE stations
      SET station_name = $1, city = $2, state = $3, platform_count = $4, is_active = $5
      WHERE station_id = $6
      RETURNING *
    `, [station_name, city, state, platform_count, is_active, id]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating station:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/stations/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM stations WHERE station_id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Station not found' });
    }
    res.json({ message: 'Station deleted successfully' });
  } catch (err) {
    console.error('Error deleting station:', err);
    res.status(500).json({ error: err.message });
  }
});

// Schedule Management API Endpoints
app.post('/api/schedules', async (req, res) => {
  const { train_id, from_station, to_station, departure_time, arrival_time, days_of_operation, is_active } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get or create the route
    let routeResult = await client.query(
      'SELECT * FROM routes WHERE from_station = $1 AND to_station = $2 AND is_active = true',
      [from_station, to_station]
    );

    let routeId;
    if (routeResult.rows.length === 0) {
      // Create a new route if it doesn't exist
      const newRouteResult = await client.query(
        'INSERT INTO routes (from_station, to_station, is_active) VALUES ($1, $2, true) RETURNING *',
        [from_station, to_station]
      );
      routeId = newRouteResult.rows[0].route_id;
    } else {
      routeId = routeResult.rows[0].route_id;
    }

    // Create the schedule
    const scheduleResult = await client.query(
      `INSERT INTO schedules (
        train_id, 
        route_id, 
        departure_time, 
        arrival_time, 
        days_of_operation, 
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [train_id, routeId, departure_time, arrival_time, days_of_operation, is_active]
    );
    
    const scheduleId = scheduleResult.rows[0].schedule_id;
    
    // Get all compartments for this train
    const compartmentsResult = await client.query(
      `SELECT tc.compartment_id, tc.total_seats 
       FROM train_compartments tc 
       WHERE tc.train_id = $1`,
      [train_id]
    );
    
    // Create seat status entries for all seats in all compartments
    for (const compartment of compartmentsResult.rows) {
      for (let seatNumber = 1; seatNumber <= compartment.total_seats; seatNumber++) {
        await client.query(
          `INSERT INTO seat_status (compartment_id, seat_number, schedule_id, status) 
           VALUES ($1, $2, $3, 'available')`,
          [compartment.compartment_id, seatNumber, scheduleId]
        );
      }
    }
    
    console.log(`Created ${compartmentsResult.rows.reduce((sum, comp) => sum + comp.total_seats, 0)} seat status entries for schedule ${scheduleId}`);

    await client.query('COMMIT');
    res.status(201).json(scheduleResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating schedule:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.put('/api/schedules/:id', async (req, res) => {
  const { train_id, from_station, to_station, departure_time, arrival_time, days_of_operation, is_active } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get or create the route
    let routeResult = await client.query(
      'SELECT * FROM routes WHERE from_station = $1 AND to_station = $2 AND is_active = true',
      [from_station, to_station]
    );

    let routeId;
    if (routeResult.rows.length === 0) {
      // Create a new route if it doesn't exist
      const newRouteResult = await client.query(
        'INSERT INTO routes (from_station, to_station, is_active) VALUES ($1, $2, true) RETURNING *',
        [from_station, to_station]
      );
      routeId = newRouteResult.rows[0].route_id;
    } else {
      routeId = routeResult.rows[0].route_id;
    }

    // Update the schedule
    const result = await client.query(
      'UPDATE schedules SET train_id = $1, route_id = $2, departure_time = $3, arrival_time = $4, days_of_operation = $5, is_active = $6 WHERE schedule_id = $7 RETURNING *',
      [train_id, routeId, departure_time, arrival_time, days_of_operation, is_active, req.params.id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Schedule not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating schedule:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/schedules/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM schedules WHERE schedule_id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json({ message: 'Schedule deleted successfully' });
  } catch (err) {
    console.error('Error deleting schedule:', err);
    res.status(500).json({ error: err.message });
  }
});

// Search trains endpoint
app.post('/api/search-trains', async (req, res) => {
  const { from_station, to_station, date } = req.body;
  console.log('Received search request:', { from_station, to_station, date });
  
  try {
    // Convert the date to a day name
    const selectedDate = new Date(date);
    const dayName = dayNames[selectedDate.getDay()];
    console.log('Converted date to day name:', dayName);

    const query = `
      WITH first_compartment AS (
        SELECT DISTINCT ON (t.train_id) 
          t.train_id,
          tc2.fare_multiplier
        FROM trains t
        JOIN train_compartments tc ON tc.train_id = t.train_id
        JOIN train_classes tc2 ON tc.class_id = tc2.class_id
        ORDER BY t.train_id, tc.compartment_number
      )
      SELECT DISTINCT
        s.schedule_id,
        s.departure_time,
        s.arrival_time,
        s.days_of_operation,
        t.train_id,
        t.train_name,
        t.fare_per_km,
        tt.type_name as train_type,
        r.distance_km,
        fs.station_name as from_station_name,
        ts.station_name as to_station_name,
        COALESCE(fc.fare_multiplier, 1.0) as fare_multiplier,
        ROUND(CAST(r.distance_km * t.fare_per_km * COALESCE(fc.fare_multiplier, 1.0) AS NUMERIC)) as total_fare
      FROM schedules s
      JOIN trains t ON s.train_id = t.train_id
      JOIN train_types tt ON t.train_type = tt.type_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN stations fs ON r.from_station = fs.station_id
      JOIN stations ts ON r.to_station = ts.station_id
      LEFT JOIN first_compartment fc ON fc.train_id = t.train_id
      WHERE r.from_station = $1 
      AND r.to_station = $2
      AND s.is_active = true
      AND t.is_active = true
      AND r.is_active = true
      AND $3 = ANY(s.days_of_operation)
      ORDER BY s.departure_time
    `;
    console.log('Executing query with params:', [from_station, to_station, dayName]);
    
    const result = await pool.query(query, [from_station, to_station, dayName]);
    console.log('Query result:', result.rows);
    
    // Ensure all rows have a valid total_fare
    const processedRows = result.rows.map(row => {
      console.log('Processing row:', {
        train_name: row.train_name,
        distance_km: row.distance_km,
        fare_per_km: row.fare_per_km,
        fare_multiplier: row.fare_multiplier,
        total_fare: row.total_fare
      });

      if (row.total_fare === null || isNaN(row.total_fare)) {
        // Calculate fare manually if total_fare is missing
        const fareMultiplier = row.fare_multiplier || 1.0;
        const distanceKm = parseFloat(row.distance_km) || 0;
        const farePerKm = parseFloat(row.fare_per_km) || 0;
        row.total_fare = Math.round(distanceKm * farePerKm * fareMultiplier);
        console.log('Manually calculated fare:', {
          train_name: row.train_name,
          calculation: `${distanceKm} * ${farePerKm} * ${fareMultiplier} = ${row.total_fare}`
        });
      }
      return row;
    });
    
    res.json(processedRows);
  } catch (err) {
    console.error('Error searching trains:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin station routes
app.get('/api/admin/stations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM stations
      ORDER BY station_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching stations:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/stations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM stations
      WHERE station_id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Station not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching station:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/stations', async (req, res) => {
  try {
    const { station_name, city, state, platform_count, is_active } = req.body;
    
    // Validate required fields
    if (!station_name || !city || !state || !platform_count) {
      return res.status(400).json({ 
        error: 'Missing required fields: station_name, city, state, and platform_count are required' 
      });
    }

    // Validate platform_count is a positive integer
    const platformCount = parseInt(platform_count);
    if (isNaN(platformCount) || platformCount <= 0) {
      return res.status(400).json({ 
        error: 'platform_count must be a positive integer' 
      });
    }
    
    const result = await pool.query(`
      INSERT INTO stations (station_name, city, state, platform_count, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [station_name, city, state, platformCount, is_active ?? true]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating station:', err);
    
    // Handle unique constraint violation
    if (err.code === '23505') { // PostgreSQL unique violation code
      return res.status(409).json({ 
        error: 'A station with this name already exists in this city' 
      });
    }
    
    res.status(500).json({ error: 'Failed to create station: ' + err.message });
  }
});

app.put('/api/admin/stations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { station_name, city, state, platform_count, is_active } = req.body;
    
    // First check if the station exists
    const existingStation = await pool.query(
      'SELECT * FROM stations WHERE station_id = $1',
      [id]
    );
    
    if (existingStation.rows.length === 0) {
      return res.status(404).json({ error: 'Station not found' });
    }
    
    // If name and city are being changed, check for conflicts
    if (station_name !== existingStation.rows[0].station_name || 
        city !== existingStation.rows[0].city) {
      const conflictCheck = await pool.query(
        'SELECT * FROM stations WHERE station_name = $1 AND city = $2 AND station_id != $3',
        [station_name, city, id]
      );
      
      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({ 
          error: 'A station with this name already exists in this city' 
        });
      }
    }
    
    // Update the station
    const result = await pool.query(`
      UPDATE stations
      SET station_name = $1, city = $2, state = $3, platform_count = $4, is_active = $5
      WHERE station_id = $6
      RETURNING *
    `, [station_name, city, state, platform_count, is_active, id]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating station:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/stations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM stations
      WHERE station_id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Station not found' });
    }
    
    res.json({ message: 'Station deleted successfully' });
  } catch (err) {
    console.error('Error deleting station:', err);
    res.status(500).json({ error: err.message });
  }
});

// Train Classes API
app.get('/api/train-classes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM train_classes
      ORDER BY class_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching train classes:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin Train Routes
app.get('/api/admin/trains', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, tt.type_name, tt.description as type_description
      FROM trains t
      JOIN train_types tt ON t.train_type = tt.type_id
      ORDER BY t.train_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching trains:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/trains/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get train details
    const trainResult = await pool.query(`
      SELECT t.*, tt.type_name
      FROM trains t
      JOIN train_types tt ON t.train_type = tt.type_id
      WHERE t.train_id = $1
    `, [id]);
    
    if (trainResult.rows.length === 0) {
      return res.status(404).json({ error: 'Train not found' });
    }
    
    const train = trainResult.rows[0];
    
    // Get train compartments
    const compartmentsResult = await pool.query(`
      SELECT tc.*, tc2.class_name, tc2.description as class_description
      FROM train_compartments tc
      JOIN train_classes tc2 ON tc.class_id = tc2.class_id
      WHERE tc.train_id = $1
      ORDER BY tc.compartment_number
    `, [id]);
    
    res.json({
      train: train,
      compartments: compartmentsResult.rows
    });
  } catch (err) {
    console.error('Error fetching train details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Check if a schedule exists
app.get('/api/schedules/:id/check', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT schedule_id, train_id FROM schedules WHERE schedule_id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ exists: false });
    }
    
    res.json({ exists: true, schedule: result.rows[0] });
  } catch (err) {
    console.error('Error checking if schedule exists:', err);
    res.status(500).json({ error: err.message });
  }
});

// Check database connection
app.get('/api/check-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT 1');
    res.json({ status: 'connected', result: result.rows[0] });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get admin dashboard stats
app.get('/api/admin/dashboard/stats', async (req, res) => {
  try {
    // Get total bookings
    const bookingsResult = await pool.query('SELECT COUNT(*) as total FROM bookings');
    const totalBookings = bookingsResult.rows[0].total;

    // Get total revenue
    const revenueResult = await pool.query(
      'SELECT COALESCE(SUM(fare_amount), 0) as total FROM bookings WHERE booking_status = \'confirmed\''
    );
    const totalRevenue = revenueResult.rows[0].total;

    // Get total trains
    const trainsResult = await pool.query('SELECT COUNT(*) as total FROM trains');
    const totalTrains = trainsResult.rows[0].total;

    // Get total routes
    const routesResult = await pool.query('SELECT COUNT(*) as total FROM routes');
    const totalRoutes = routesResult.rows[0].total;

    // Get active bookings count
    const activeBookingsResult = await pool.query(
      'SELECT COUNT(*) as total FROM bookings WHERE booking_status = \'confirmed\''
    );
    const activeBookings = activeBookingsResult.rows[0].total;

    // Get today's revenue
    const todayRevenueResult = await pool.query(
      'SELECT COALESCE(SUM(fare_amount), 0) as total FROM bookings WHERE booking_status = \'confirmed\' AND booking_date = CURRENT_DATE'
    );
    const todayRevenue = todayRevenueResult.rows[0].total;

    // Get pending cancellations count
    const pendingCancellationsResult = await pool.query(
      'SELECT COUNT(*) as total FROM bookings WHERE booking_status = \'pending\''
    );
    const pendingCancellations = pendingCancellationsResult.rows[0].total;

    res.json({
      totalBookings,
      totalRevenue,
      totalTrains,
      totalRoutes,
      activeBookings,
      todayRevenue,
      pendingCancellations
    });
  } catch (err) {
    console.error('Error getting dashboard stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get recent bookings for admin dashboard
app.get('/api/admin/recent-bookings', async (req, res) => {
  let client;
  try {
    console.log('Attempting to connect to database...');
    client = await pool.connect();
    console.log('Successfully connected to database');
    
    // First check if there are any bookings
    console.log('Checking for existing bookings...');
    const countResult = await client.query('SELECT COUNT(*) FROM bookings');
    const bookingCount = parseInt(countResult.rows[0].count);
    console.log(`Found ${bookingCount} bookings`);
    
    if (bookingCount === 0) {
      console.log('No bookings found, returning empty array');
      return res.json([]);
    }
    
    // If bookings exist, proceed with the full query
    console.log('Fetching recent bookings...');
    const result = await client.query(`
      SELECT 
        b.booking_id,
        b.passenger_name,
        b.booking_date,
        b.booking_status,
        b.fare_amount,
        b.seat_number,
        COALESCE(t.train_name, 'Unknown Train') as train_name,
        COALESCE(fs.station_name, 'Unknown Station') as from_station_name,
        COALESCE(ts.station_name, 'Unknown Station') as to_station_name,
        COALESCE(s.departure_time, '00:00') as departure_time,
        COALESCE(s.arrival_time, '00:00') as arrival_time
      FROM bookings b
      LEFT JOIN schedules s ON b.schedule_id = s.schedule_id
      LEFT JOIN trains t ON s.train_id = t.train_id
      LEFT JOIN routes r ON s.route_id = r.route_id
      LEFT JOIN stations fs ON r.from_station = fs.station_id
      LEFT JOIN stations ts ON r.to_station = ts.station_id
      ORDER BY b.booking_date DESC, b.booking_id DESC
      LIMIT 10
    `);
    console.log(`Successfully fetched ${result.rows.length} recent bookings`);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting recent bookings:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: err.message });
  } finally {
    if (client) {
      console.log('Releasing database connection');
      client.release();
    }
  }
});

// Get revenue data for admin dashboard
app.get('/api/admin/dashboard/revenue', async (req, res) => {
  try {
    // Get daily revenue for the last 30 days
    const dailyRevenueResult = await pool.query(`
      SELECT 
        DATE(booking_date) as date,
        COALESCE(SUM(fare_amount), 0) as revenue
      FROM bookings 
      WHERE booking_status = 'confirmed'
        AND booking_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(booking_date)
      ORDER BY date DESC
    `);

    // Get revenue by train class - simplified query that doesn't rely on train_compartments
    const classRevenueResult = await pool.query(`
      SELECT 
        'All Classes' as class_name,
        COALESCE(SUM(fare_amount), 0) as revenue
      FROM bookings
      WHERE booking_status = 'confirmed'
    `);

    // Ensure we always return arrays, even if empty
    res.json({
      dailyRevenue: dailyRevenueResult.rows || [],
      classRevenue: classRevenueResult.rows || []
    });
  } catch (err) {
    console.error('Error getting revenue data:', err);
    res.status(500).json({ 
      error: err.message,
      dailyRevenue: [],
      classRevenue: []
    });
  }
});

// Get booking stats for admin dashboard
app.get('/api/admin/dashboard/booking-stats', async (req, res) => {
  try {
    // Get booking status counts
    const statusCountsResult = await pool.query(`
      SELECT 
        booking_status,
        COUNT(*) as count
      FROM bookings
      GROUP BY booking_status
    `);

    // Get bookings by day of week
    const dayStatsResult = await pool.query(`
      SELECT 
        EXTRACT(DOW FROM booking_date) as day_of_week,
        COUNT(*) as count
      FROM bookings
      WHERE booking_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY day_of_week
      ORDER BY day_of_week
    `);

    res.json({
      statusCounts: statusCountsResult.rows,
      dayStats: dayStatsResult.rows
    });
  } catch (err) {
    console.error('Error getting booking stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update train details
app.put('/api/admin/trains/:id', async (req, res) => {
    const { id } = req.params;
    const { train_name, train_type, total_seats, fare_per_km, is_active, compartments } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Update train details
        const trainResult = await client.query(
            'UPDATE trains SET train_name = $1, train_type = $2, total_seats = $3, fare_per_km = $4, is_active = $5 WHERE train_id = $6 RETURNING *',
            [train_name, train_type, total_seats, fare_per_km, is_active, id]
        );
        
        if (trainResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Train not found' });
        }
        
        // Delete existing compartments
        await client.query('DELETE FROM train_compartments WHERE train_id = $1', [id]);
        
        // Insert new compartments
        for (const compartment of compartments) {
            await client.query(
                'INSERT INTO train_compartments (train_id, class_id, compartment_number, total_seats) VALUES ($1, $2, $3, $4)',
                [id, compartment.class_id, compartment.compartment_number, compartment.total_seats]
            );
        }
        
        await client.query('COMMIT');
        
        // Get the updated train with its compartments
        const updatedTrain = await client.query(`
            SELECT t.*, tt.type_name
            FROM trains t
            JOIN train_types tt ON t.train_type = tt.type_id
            WHERE t.train_id = $1
        `, [id]);
        
        const updatedCompartments = await client.query(`
            SELECT tc.*, tc2.class_name, tc2.description as class_description
            FROM train_compartments tc
            JOIN train_classes tc2 ON tc.class_id = tc2.class_id
            WHERE tc.train_id = $1
            ORDER BY tc.compartment_number
        `, [id]);
        
        res.json({
            train: updatedTrain.rows[0],
            compartments: updatedCompartments.rows
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating train:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Get all bookings for passengers
app.get('/api/bookings', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = `
      SELECT b.*, t.train_name, 
             fs.station_name as from_station_name,
             ts.station_name as to_station_name,
             s.departure_time, s.arrival_time,
             b.booking_date as journey_date
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN trains t ON s.train_id = t.train_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN stations fs ON r.from_station = fs.station_id
      JOIN stations ts ON r.to_station = ts.station_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (b.booking_id::text LIKE $${paramCount} OR b.passenger_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      query += ` AND b.booking_status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY b.booking_date DESC, b.booking_id DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a single booking by ID for passengers
app.get('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching booking details for ID:', id);
    
    // First check if the booking exists
    const bookingCheck = await pool.query(
      'SELECT * FROM bookings WHERE booking_id = $1',
      [id]
    );
    
    if (bookingCheck.rows.length === 0) {
      console.log('No booking found with ID:', id);
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const booking = bookingCheck.rows[0];
    console.log('Found booking:', booking);
    
    // Get schedule details
    const scheduleQuery = `
      SELECT s.*, t.train_name, 
             fs.station_name as from_station_name,
             ts.station_name as to_station_name
      FROM schedules s
      JOIN trains t ON s.train_id = t.train_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN stations fs ON r.from_station = fs.station_id
      JOIN stations ts ON r.to_station = ts.station_id
      WHERE s.schedule_id = $1
    `;
    
    const scheduleResult = await pool.query(scheduleQuery, [booking.schedule_id]);
    console.log('Schedule result:', scheduleResult.rows);
    
    if (scheduleResult.rows.length === 0) {
      console.log('No schedule found for booking:', booking.schedule_id);
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    // Get compartment details if available
    let compartmentDetails = null;
    if (booking.compartment_id) {
      const compartmentQuery = `
        SELECT tc.*, tc2.class_name
        FROM train_compartments tc
        LEFT JOIN train_classes tc2 ON tc.class_id = tc2.class_id
        WHERE tc.compartment_id = $1
      `;
      
      const compartmentResult = await pool.query(compartmentQuery, [booking.compartment_id]);
      console.log('Compartment result:', compartmentResult.rows);
      
      if (compartmentResult.rows.length > 0) {
        compartmentDetails = compartmentResult.rows[0];
      }
    }
    
    // Combine all the information
    const response = {
      ...booking,
      ...scheduleResult.rows[0],
      class_name: compartmentDetails?.class_name || 'Unknown'
    };
    
    console.log('Sending response:', response);
    res.json(response);
  } catch (err) {
    console.error('Error fetching booking:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// Admin train routes
app.post('/api/admin/trains', async (req, res) => {
    const { train_name, train_type, total_seats, fare_per_km, is_active, compartments } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Create the train
        const trainResult = await client.query(
            'INSERT INTO trains (train_name, train_type, total_seats, fare_per_km, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [train_name, train_type, total_seats, fare_per_km, is_active]
        );
        
        const train = trainResult.rows[0];
        
        // Create compartments if provided
        if (compartments && Array.isArray(compartments)) {
            for (const compartment of compartments) {
                await client.query(
                    'INSERT INTO train_compartments (train_id, class_id, compartment_number, total_seats) VALUES ($1, $2, $3, $4)',
                    [train.train_id, compartment.class_id, compartment.compartment_number, compartment.total_seats]
                );
            }
        }
        
        await client.query('COMMIT');
        
        // Get the created train with its compartments
        const createdTrain = await client.query(`
            SELECT t.*, tt.type_name
            FROM trains t
            JOIN train_types tt ON t.train_type = tt.type_id
            WHERE t.train_id = $1
        `, [train.train_id]);
        
        const createdCompartments = await client.query(`
            SELECT tc.*, tc2.class_name, tc2.description as class_description
            FROM train_compartments tc
            JOIN train_classes tc2 ON tc.class_id = tc2.class_id
            WHERE tc.train_id = $1
            ORDER BY tc.compartment_number
        `, [train.train_id]);
        
        res.status(201).json({
            train: createdTrain.rows[0],
            compartments: createdCompartments.rows
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating train:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Cancel a booking
app.post('/api/bookings/:id/cancel', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // First check if the booking exists and is not already cancelled
    const bookingCheck = await client.query(
      'SELECT booking_status, schedule_id, compartment_id, seat_number FROM bookings WHERE booking_id = $1',
      [req.params.id]
    );
    
    if (bookingCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (bookingCheck.rows[0].booking_status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }
    
    // Update the booking status to cancelled
    await client.query(
      'UPDATE bookings SET booking_status = $1 WHERE booking_id = $2',
      ['cancelled', req.params.id]
    );
    
    // Update seat status back to available
    await client.query(
      'UPDATE seat_status SET status = $1 WHERE schedule_id = $2 AND compartment_id = $3 AND seat_number = $4',
      ['available', bookingCheck.rows[0].schedule_id, bookingCheck.rows[0].compartment_id, bookingCheck.rows[0].seat_number]
    );
    
    // Get the updated booking details
    const result = await client.query(`
      SELECT b.*, t.train_name, 
             fs.station_name as from_station_name,
             ts.station_name as to_station_name,
             s.departure_time, s.arrival_time,
             b.booking_date as journey_date
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN trains t ON s.train_id = t.train_id
      JOIN routes r ON s.route_id = r.route_id
      JOIN stations fs ON r.from_station = fs.station_id
      JOIN stations ts ON r.to_station = ts.station_id
      WHERE b.booking_id = $1
    `, [req.params.id]);
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error cancelling booking:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});