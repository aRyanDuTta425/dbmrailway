-- Script to reduce the number of seats in all train compartments
-- This will improve performance when fetching seat information

-- Update train_compartments table to reduce the number of seats
UPDATE train_compartments
SET total_seats = CASE
    WHEN class_id = 1 THEN 10  -- First Class: 10 seats (was 50)
    WHEN class_id = 2 THEN 20  -- Second Class: 20 seats (was 100)
    WHEN class_id = 3 THEN 30  -- Third Class: 30 seats (was 150)
    WHEN class_id = 4 THEN 15  -- Sleeper Class: 15 seats (was 100)
    ELSE 25                    -- Other classes: 25 seats (was 150)
END;

-- Delete existing seat_status entries
DELETE FROM seat_status;

-- Recreate seat_status entries for all schedules
DO $$
DECLARE
    schedule_record RECORD;
    compartment_record RECORD;
    seat_number INTEGER;
BEGIN
    FOR schedule_record IN SELECT schedule_id, train_id FROM schedules LOOP
        FOR compartment_record IN 
            SELECT tc.compartment_id, tc.total_seats 
            FROM train_compartments tc 
            WHERE tc.train_id = schedule_record.train_id
        LOOP
            FOR seat_number IN 1..compartment_record.total_seats LOOP
                INSERT INTO seat_status (compartment_id, seat_number, schedule_id, status)
                VALUES (compartment_record.compartment_id, seat_number, schedule_record.schedule_id, 'available');
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- Output the updated compartment information
SELECT tc.compartment_id, t.train_name, tc.class_id, tc.compartment_number, tc.total_seats
FROM train_compartments tc
JOIN trains t ON tc.train_id = t.train_id
ORDER BY tc.compartment_id; 