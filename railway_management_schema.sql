-- Railway Management System Database Schema
-- Created for DBMS Project

-- Drop existing tables if they exist
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS seat_status CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS train_compartments CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS trains CASCADE;
DROP TABLE IF EXISTS stations CASCADE;
DROP TABLE IF EXISTS train_classes CASCADE;
DROP TABLE IF EXISTS train_types CASCADE;
DROP TABLE IF EXISTS maintenance_records CASCADE;

-- Create train_types table
CREATE TABLE train_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- Create train_classes table
CREATE TABLE train_classes (
    class_id SERIAL PRIMARY KEY,
    class_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    fare_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00
);

-- Create stations table
CREATE TABLE stations (
    station_id SERIAL PRIMARY KEY,
    station_name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    platform_count INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(station_name, city)
);

-- Create trains table
CREATE TABLE trains (
    train_id SERIAL PRIMARY KEY,
    train_name VARCHAR(100) NOT NULL,
    train_type INTEGER REFERENCES train_types(type_id),
    total_seats INTEGER NOT NULL,
    fare_per_km DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Create routes table
CREATE TABLE routes (
    route_id SERIAL PRIMARY KEY,
    from_station INTEGER REFERENCES stations(station_id),
    to_station INTEGER REFERENCES stations(station_id),
    distance_km DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(from_station, to_station)
);

-- Create train_compartments table
CREATE TABLE train_compartments (
    compartment_id SERIAL PRIMARY KEY,
    train_id INTEGER REFERENCES trains(train_id),
    class_id INTEGER REFERENCES train_classes(class_id),
    compartment_number INTEGER NOT NULL,
    total_seats INTEGER NOT NULL,
    UNIQUE(train_id, compartment_number)
);

-- Create schedules table
CREATE TABLE schedules (
    schedule_id SERIAL PRIMARY KEY,
    train_id INTEGER REFERENCES trains(train_id),
    route_id INTEGER REFERENCES routes(route_id),
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    days_of_operation TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Create seat_status table
CREATE TABLE seat_status (
    compartment_id INTEGER REFERENCES train_compartments(compartment_id),
    seat_number INTEGER NOT NULL,
    schedule_id INTEGER REFERENCES schedules(schedule_id),
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    PRIMARY KEY (compartment_id, seat_number, schedule_id)
);

-- Create bookings table
CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES schedules(schedule_id),
    compartment_id INTEGER REFERENCES train_compartments(compartment_id),
    seat_number INTEGER NOT NULL,
    passenger_name VARCHAR(100) NOT NULL,
    passenger_age INTEGER NOT NULL,
    passenger_gender VARCHAR(10) NOT NULL,
    booking_status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    fare_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    FOREIGN KEY (compartment_id, seat_number, schedule_id) 
        REFERENCES seat_status(compartment_id, seat_number, schedule_id)
);

-- Create maintenance_records table
CREATE TABLE maintenance_records (
    record_id SERIAL PRIMARY KEY,
    train_id INTEGER REFERENCES trains(train_id),
    start_date DATE NOT NULL,
    end_date DATE,
    maintenance_type VARCHAR(50) NOT NULL,
    description TEXT,
    cost DECIMAL(10,2),
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data for train_types
INSERT INTO train_types (type_name, description) VALUES
('Express', 'Fast trains with limited stops'),
('Superfast', 'High-speed trains with premium services'),
('Passenger', 'Regular trains with frequent stops'),
('Rajdhani', 'Premium long-distance trains'),
('Shatabdi', 'High-speed day trains');

-- Insert sample data for train_classes
INSERT INTO train_classes (class_name, description, fare_multiplier) VALUES
('First Class', 'Luxury seating with premium services', 2.50),
('Second Class', 'Comfortable seating with basic amenities', 1.75),
('Sleeper Class', 'Basic sleeping arrangements', 1.00),
('AC Class', 'Air-conditioned comfort', 1.50),
('General Class', 'Basic seating arrangement', 0.75);

-- Insert sample data for stations
INSERT INTO stations (station_name, city, state, platform_count) VALUES
('New Delhi', 'Delhi', 'Delhi', 16),
('Mumbai Central', 'Mumbai', 'Maharashtra', 12),
('Howrah', 'Kolkata', 'West Bengal', 15),
('Chennai Central', 'Chennai', 'Tamil Nadu', 14),
('Bangalore City', 'Bangalore', 'Karnataka', 10),
('Hyderabad Deccan', 'Hyderabad', 'Telangana', 8),
('Ahmedabad', 'Ahmedabad', 'Gujarat', 9),
('Lucknow', 'Lucknow', 'Uttar Pradesh', 7);

-- Insert sample data for trains
INSERT INTO trains (train_name, train_type, total_seats, fare_per_km) VALUES
('Rajdhani Express', 4, 500, 2.50),
('Shatabdi Express', 5, 400, 2.00),
('Duronto Express', 1, 600, 1.75),
('Garib Rath', 3, 800, 1.25),
('Deccan Queen', 2, 450, 1.50);

-- Insert sample data for routes with distances
INSERT INTO routes (from_station, to_station, distance_km) VALUES
(1, 2, 1384.0), -- Delhi to Mumbai
(2, 3, 1934.0), -- Mumbai to Kolkata
(3, 4, 1659.0), -- Kolkata to Chennai
(4, 5, 359.0),  -- Chennai to Bangalore
(5, 6, 569.0),  -- Bangalore to Hyderabad
(6, 7, 711.0),  -- Hyderabad to Ahmedabad
(7, 8, 525.0),  -- Ahmedabad to Lucknow
(8, 1, 516.0);  -- Lucknow to Delhi

-- Insert sample data for train_compartments
INSERT INTO train_compartments (train_id, class_id, compartment_number, total_seats) VALUES
(1, 1, 1, 50),  -- First Class
(1, 2, 2, 100), -- Second Class
(1, 3, 3, 150), -- Sleeper Class
(2, 4, 1, 100), -- AC Class
(2, 5, 2, 150); -- General Class

-- Insert sample data for schedules
INSERT INTO schedules (train_id, route_id, departure_time, arrival_time, days_of_operation) VALUES
(1, 1, '16:00:00', '08:00:00', ARRAY['Monday', 'Wednesday', 'Friday']),
(2, 2, '20:00:00', '10:00:00', ARRAY['Tuesday', 'Thursday', 'Saturday']),
(3, 3, '22:00:00', '12:00:00', ARRAY['Monday', 'Thursday', 'Sunday']),
(4, 4, '06:00:00', '18:00:00', ARRAY['Wednesday', 'Saturday']),
(5, 5, '08:00:00', '20:00:00', ARRAY['Tuesday', 'Friday']);

-- Insert sample data for seat_status
INSERT INTO seat_status (compartment_id, seat_number, schedule_id, status) VALUES
(1, 1, 1, 'available'),
(1, 2, 1, 'booked'),
(2, 1, 1, 'available'),
(2, 2, 1, 'available'),
(3, 1, 1, 'booked');

-- Insert sample data for bookings
INSERT INTO bookings (schedule_id, compartment_id, seat_number, passenger_name, passenger_age, passenger_gender, fare_amount) VALUES
(1, 1, 2, 'John Doe', 30, 'Male', 1500.00),
(1, 3, 1, 'Jane Smith', 25, 'Female', 1200.00);

-- Insert sample data for maintenance_records
INSERT INTO maintenance_records (train_id, start_date, end_date, maintenance_type, description, cost, status) VALUES
(1, '2024-01-01', '2024-01-05', 'Regular Maintenance', 'Engine overhaul and brake system check', 50000.00, 'completed'),
(2, '2024-02-01', NULL, 'Emergency Repair', 'AC system malfunction', 25000.00, 'in_progress');

-- Create indexes for better performance
CREATE INDEX idx_trains_type ON trains(train_type);
CREATE INDEX idx_routes_stations ON routes(from_station, to_station);
CREATE INDEX idx_schedules_train ON schedules(train_id);
CREATE INDEX idx_schedules_route ON schedules(route_id);
CREATE INDEX idx_bookings_schedule ON bookings(schedule_id);
CREATE INDEX idx_seat_status_schedule ON seat_status(schedule_id);
CREATE INDEX idx_maintenance_train ON maintenance_records(train_id);
CREATE INDEX idx_maintenance_status ON maintenance_records(status);

-- Add comments to tables
COMMENT ON TABLE trains IS 'Stores information about all trains in the system';
COMMENT ON TABLE train_types IS 'Defines different categories of trains';
COMMENT ON TABLE train_classes IS 'Defines different classes of travel';
COMMENT ON TABLE stations IS 'Stores information about all railway stations';
COMMENT ON TABLE routes IS 'Defines paths between stations';
COMMENT ON TABLE schedules IS 'Contains train timings and routes';
COMMENT ON TABLE seat_status IS 'Tracks seat availability for each schedule';
COMMENT ON TABLE bookings IS 'Stores passenger booking information';
COMMENT ON TABLE maintenance_records IS 'Tracks train maintenance history'; 