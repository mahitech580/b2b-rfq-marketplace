CREATE DATABASE IF NOT EXISTS rfq_marketplace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'rfq_user'@'localhost' IDENTIFIED BY 'rfq_password';
GRANT ALL PRIVILEGES ON rfq_marketplace.* TO 'rfq_user'@'localhost';
FLUSH PRIVILEGES;
USE rfq_marketplace;

-- Tables are created automatically by SQLAlchemy when the Flask app starts.
-- This file is kept for database setup and credential/bootstrap reference.
