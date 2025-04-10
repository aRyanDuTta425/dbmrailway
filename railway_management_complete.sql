-- Railway Management System Complete Database Setup
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
    description TEXT,
    base_fare_per_km DECIMAL(10,2)
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
    estimated_duration TIME,
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

-- Insert train types
INSERT INTO train_types (type_name, description, base_fare_per_km) VALUES
('Express', 'Fast trains with limited stops', 2.5),
('Superfast', 'High-speed trains with premium services', 3.0),
('Local', 'Regular trains with frequent stops', 1.5),
('Luxury', 'Premium trains with first-class amenities', 4.0);

-- Insert train classes
INSERT INTO train_classes (class_name, description, fare_multiplier) VALUES
('First Class', 'Luxury seating with premium services', 2.0),
('Second Class', 'Comfortable seating with basic amenities', 1.5),
('Third Class', 'Standard seating', 1.0),
('Sleeper Class', 'Basic sleeping arrangements', 1.2);

-- Insert stations
INSERT INTO stations (station_name, city, state, platform_count) VALUES
('Mumbai Central', 'Mumbai', 'Maharashtra', 12),
('New Delhi', 'Delhi', 'Delhi', 16),
('Chennai Central', 'Chennai', 'Tamil Nadu', 10),
('Kolkata', 'Kolkata', 'West Bengal', 15),
('Bangalore City', 'Bangalore', 'Karnataka', 8);

-- Insert trains
INSERT INTO trains (train_name, train_type, total_seats, fare_per_km) VALUES
('Rajdhani Express', 1, 500, 2.5),
('Shatabdi Express', 2, 300, 3.0),
('Duronto Express', 2, 400, 2.8),
('Garib Rath', 3, 600, 1.5),
('Palace on Wheels', 4, 200, 4.0),
('Deccan Queen', 1, 450, 2.6),
('August Kranti', 2, 550, 2.7),
('Golden Temple Mail', 1, 480, 2.4),
('Konkan Kanya', 3, 520, 1.8),
('Maharaja Express', 4, 180, 4.2),
('Vande Bharat Express', 2, 350, 3.2),
('Gatimaan Express', 2, 400, 3.1),
('Tejas Express', 2, 450, 2.9),
('Humsafar Express', 1, 550, 2.3),
('Antyodaya Express', 3, 700, 1.4),
('Uday Express', 2, 400, 2.8),
('Rani Chennamma', 1, 500, 2.5),
('Karnataka Express', 1, 480, 2.4),
('Mysore Express', 3, 550, 1.7),
('Chennai Express', 2, 450, 2.9),
('Coromandel Express', 1, 520, 2.5),
('Howrah Express', 2, 480, 2.8);

-- Insert routes
INSERT INTO routes (from_station, to_station, distance_km, estimated_duration) VALUES
(1, 2, 1384.0, '16:00:00'),  -- Mumbai to Delhi
(2, 1, 1384.0, '16:00:00'),  -- Delhi to Mumbai
(1, 3, 1298.0, '20:00:00'),  -- Mumbai to Chennai
(3, 1, 1298.0, '20:00:00'),  -- Chennai to Mumbai
(1, 4, 1930.0, '24:00:00'),  -- Mumbai to Kolkata
(4, 1, 1930.0, '24:00:00'),  -- Kolkata to Mumbai
(1, 5, 983.0, '16:00:00'),   -- Mumbai to Bangalore
(5, 1, 983.0, '16:00:00'),   -- Bangalore to Mumbai
(2, 3, 2180.0, '28:00:00'),  -- Delhi to Chennai
(3, 2, 2180.0, '28:00:00'),  -- Chennai to Delhi
(2, 4, 1454.0, '17:00:00'),  -- Delhi to Kolkata
(4, 2, 1454.0, '17:00:00'),  -- Kolkata to Delhi
(2, 5, 2150.0, '32:00:00'),  -- Delhi to Bangalore
(5, 2, 2150.0, '32:00:00'),  -- Bangalore to Delhi
(3, 4, 1659.0, '26:00:00'),  -- Chennai to Kolkata
(4, 3, 1659.0, '26:00:00'),  -- Kolkata to Chennai
(3, 5, 362.0, '06:00:00'),   -- Chennai to Bangalore
(5, 3, 362.0, '06:00:00'),   -- Bangalore to Chennai
(4, 5, 1920.0, '30:00:00'),  -- Kolkata to Bangalore
(5, 4, 1920.0, '30:00:00');  -- Bangalore to Kolkata

-- Insert train compartments
INSERT INTO train_compartments (train_id, class_id, compartment_number, total_seats) VALUES
(1, 1, 1, 50),   -- Rajdhani Express First Class
(1, 2, 2, 100),  -- Rajdhani Express Second Class
(1, 3, 3, 150),  -- Rajdhani Express Third Class
(2, 1, 1, 40),   -- Shatabdi Express First Class
(2, 2, 2, 80),   -- Shatabdi Express Second Class
(3, 2, 1, 100),  -- Duronto Express Second Class
(3, 3, 2, 150),  -- Duronto Express Third Class
(4, 3, 1, 200),  -- Garib Rath Third Class
(5, 1, 1, 30),   -- Palace on Wheels First Class
(5, 2, 2, 50);   -- Palace on Wheels Second Class

-- Insert schedules
INSERT INTO schedules (train_id, route_id, departure_time, arrival_time, days_of_operation) VALUES
(1, 1, '16:00:00', '08:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(11, 2, '16:30:00', '08:30:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(6, 3, '08:00:00', '04:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(20, 4, '09:00:00', '05:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(7, 5, '20:00:00', '20:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(22, 6, '21:00:00', '21:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(9, 7, '22:00:00', '14:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(18, 8, '23:00:00', '15:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(2, 9, '06:00:00', '10:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(12, 10, '07:00:00', '11:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(3, 11, '22:00:00', '15:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(14, 12, '23:00:00', '16:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(1, 13, '16:00:00', '00:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(17, 14, '17:00:00', '01:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(19, 15, '18:00:00', '20:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(15, 16, '19:00:00', '21:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(2, 17, '06:00:00', '12:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(19, 18, '07:00:00', '13:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(13, 19, '20:00:00', '02:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
(16, 20, '21:00:00', '03:00:00', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);

-- Insert seat status
INSERT INTO seat_status (compartment_id, seat_number, schedule_id, status) VALUES
(1, 1, 1, 'available'),
(1, 2, 1, 'booked'),
(2, 1, 1, 'available'),
(2, 2, 1, 'available'),
(3, 1, 1, 'booked');

-- Insert sample bookings
INSERT INTO bookings (schedule_id, compartment_id, seat_number, passenger_name, passenger_age, passenger_gender, fare_amount) VALUES
(1, 1, 2, 'John Doe', 30, 'Male', 1500.00),
(1, 3, 1, 'Jane Smith', 25, 'Female', 1200.00);

-- Insert maintenance records
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