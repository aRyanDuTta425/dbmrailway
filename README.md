# Railway Management System

A basic Railway Management System using Node.js, Express, and PostgreSQL.

## Setup Instructions

1. Create a PostgreSQL database named 'railway_management'
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a .env file with your database credentials:
   ```
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=railway_management
   PORT=3000
   ```
4. Initialize the database:
   ```bash
   node initDb.js
   ```
5. Run the application:
   ```bash
   npm run dev
   ```

## Features

- Train management
- Station management
- Schedule management
- Basic booking system

## API Endpoints

### Trains

- GET /api/trains - Get all trains
- POST /api/trains - Add a new train
- GET /api/trains/:id - Get train by ID

### Stations

- GET /api/stations - Get all stations
- POST /api/stations - Add a new station
- GET /api/stations/:id - Get station by ID

### Schedules

- GET /api/schedules - Get all schedules
- POST /api/schedules - Add a new schedule
- GET /api/schedules/:id - Get schedule by ID

### Bookings

- GET /api/bookings - Get all bookings
- POST /api/bookings - Create a new booking
- GET /api/bookings/:id - Get booking by ID
