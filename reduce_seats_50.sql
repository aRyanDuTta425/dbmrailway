-- Update train_compartments table to reduce seats
-- First, delete all existing bookings
DELETE FROM bookings;

-- Then delete all existing seat_status entries
DELETE FROM seat_status;

-- Then delete all existing compartments
DELETE FROM train_compartments;

-- Insert new compartments with reduced seats
-- For each train, create compartments with a total of 50 seats

-- For Rajdhani Express (train_id = 1)
INSERT INTO train_compartments (train_id, class_id, compartment_number, total_seats) VALUES
(1, 1, 1, 25), -- AC First Class
(1, 2, 2, 25); -- AC 2 Tier

-- For Shatabdi Express (train_id = 2)
INSERT INTO train_compartments (train_id, class_id, compartment_number, total_seats) VALUES
(2, 1, 1, 25), -- AC First Class
(2, 3, 2, 25); -- AC Chair Car

-- For Duronto Express (train_id = 3)
INSERT INTO train_compartments (train_id, class_id, compartment_number, total_seats) VALUES
(3, 1, 1, 25), -- AC First Class
(3, 2, 2, 25); -- AC 2 Tier

-- For Garib Rath (train_id = 4)
INSERT INTO train_compartments (train_id, class_id, compartment_number, total_seats) VALUES
(4, 2, 1, 25), -- AC 2 Tier
(4, 3, 2, 25); -- AC Chair Car

-- For Deccan Queen (train_id = 5)
INSERT INTO train_compartments (train_id, class_id, compartment_number, total_seats) VALUES
(5, 1, 1, 25), -- AC First Class
(5, 3, 2, 25); -- AC Chair Car

-- For Vande Bharat (train_id = 7)
INSERT INTO train_compartments (train_id, class_id, compartment_number, total_seats) VALUES
(7, 1, 1, 25), -- AC First Class
(7, 3, 2, 25); -- AC Chair Car

-- For Agman Express (train_id = 8)
INSERT INTO train_compartments (train_id, class_id, compartment_number, total_seats) VALUES
(8, 1, 1, 25), -- AC First Class
(8, 2, 2, 25); -- AC 2 Tier

-- For Deccan Queen (train_id = 9)
INSERT INTO train_compartments (train_id, class_id, compartment_number, total_seats) VALUES
(9, 1, 1, 25), -- AC First Class
(9, 3, 2, 25); -- AC Chair Car

-- For CCCC (train_id = 11)
INSERT INTO train_compartments (train_id, class_id, compartment_number, total_seats) VALUES
(11, 1, 1, 25), -- AC First Class
(11, 3, 2, 25); -- AC Chair Car

-- Update the total_seats in the trains table
UPDATE trains SET total_seats = 50; 