-- CREATE DATABASE IF NOT EXISTS HotelManagement;
-- USE HotelManagement;

-- CREATE TABLE IF NOT EXISTS rooms (
--     room_id INT AUTO_INCREMENT PRIMARY KEY,
--     room_number VARCHAR(20) NOT NULL UNIQUE,
--     room_type VARCHAR(80) NOT NULL,
--     price_per_night DECIMAL(10,2) NOT NULL,
--     capacity INT NOT NULL DEFAULT 2,
--     room_status VARCHAR(30) NOT NULL DEFAULT 'Available'
-- ) ENGINE=InnoDB;

-- CREATE TABLE IF NOT EXISTS guests (
--     guest_id INT AUTO_INCREMENT PRIMARY KEY,
--     full_name VARCHAR(120) NOT NULL,
--     email VARCHAR(160) NOT NULL,
--     phone VARCHAR(30) NOT NULL,
--     UNIQUE KEY unique_guest_email (email)
-- ) ENGINE=InnoDB;

-- CREATE TABLE IF NOT EXISTS reservations (
--     reservation_id INT AUTO_INCREMENT PRIMARY KEY,
--     guest_id INT NOT NULL,
--     room_id INT NOT NULL,
--     check_in DATE NOT NULL,
--     check_out DATE NOT NULL,
--     booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     booking_status VARCHAR(30) NOT NULL DEFAULT 'Confirmed',
--     CONSTRAINT fk_reservation_guest FOREIGN KEY (guest_id) REFERENCES guests(guest_id),
--     CONSTRAINT fk_reservation_room FOREIGN KEY (room_id) REFERENCES rooms(room_id),
--     INDEX idx_reservation_dates (room_id, check_in, check_out, booking_status)
-- ) ENGINE=InnoDB;

-- CREATE TABLE IF NOT EXISTS payments (
--     payment_id INT AUTO_INCREMENT PRIMARY KEY,
--     reservation_id INT NOT NULL,
--     amount DECIMAL(10,2) NOT NULL,
--     payment_date DATETIME NULL,
--     payment_method VARCHAR(50) DEFAULT 'Demo UPI',
--     payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
--     CONSTRAINT fk_payment_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id),
--     INDEX idx_payment_reservation (reservation_id)
-- ) ENGINE=InnoDB;

-- CREATE TABLE IF NOT EXISTS services (
--     service_id INT AUTO_INCREMENT PRIMARY KEY,
--     service_name VARCHAR(100) NOT NULL,
--     description TEXT,
--     service_price DECIMAL(10,2) NOT NULL DEFAULT 0
-- ) ENGINE=InnoDB;

-- -- Sample data is added only when the same room number/service name does not already exist.
-- INSERT INTO rooms (room_number, room_type, price_per_night, capacity, room_status)
-- SELECT '101', 'Standard Non-AC', 1200, 2, 'Available'
-- WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE room_number = '101');

-- INSERT INTO rooms (room_number, room_type, price_per_night, capacity, room_status)
-- SELECT '102', 'Standard AC', 1600, 2, 'Available'
-- WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE room_number = '102');

-- INSERT INTO rooms (room_number, room_type, price_per_night, capacity, room_status)
-- SELECT '201', 'Deluxe AC', 2200, 3, 'Available'
-- WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE room_number = '201');

-- INSERT INTO rooms (room_number, room_type, price_per_night, capacity, room_status)
-- SELECT '202', 'Family Room', 3000, 4, 'Available'
-- WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE room_number = '202');

-- INSERT INTO services (service_name, description, service_price)
-- SELECT 'Room Service', 'Food and refreshments delivered to your room.', 250
-- WHERE NOT EXISTS (SELECT 1 FROM services WHERE service_name = 'Room Service');

-- INSERT INTO services (service_name, description, service_price)
-- SELECT 'Laundry Service', 'Convenient laundry and ironing service.', 150
-- WHERE NOT EXISTS (SELECT 1 FROM services WHERE service_name = 'Laundry Service');

-- INSERT INTO services (service_name, description, service_price)
-- SELECT 'Airport Transfer', 'Pre-booked airport pickup and drop service.', 800
-- WHERE NOT EXISTS (SELECT 1 FROM services WHERE service_name = 'Airport Transfer');

-- INSERT INTO services (service_name, description, service_price)
-- SELECT 'Travel Assistance', 'Help with local sightseeing and travel information.', 0
-- WHERE NOT EXISTS (SELECT 1 FROM services WHERE service_name = 'Travel Assistance');

-- USE HotelManagement;

-- ALTER TABLE payments
-- ALTER COLUMN payment_date SET DEFAULT CURRENT_TIMESTAMP;

USE HotelManagement;

SELECT * from reservations;

SELECT * from guests;