-- ============================================================
-- B2B RFQ MARKETPLACE
-- Complete MySQL 8.x Database
-- ============================================================

-- ------------------------------------------------------------
-- 1. DATABASE + APPLICATION USER
-- ------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS rfq_marketplace
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'rfq_user'@'localhost'
    IDENTIFIED BY 'rfq_password';

GRANT ALL PRIVILEGES ON rfq_marketplace.* TO 'rfq_user'@'localhost';

FLUSH PRIVILEGES;

USE rfq_marketplace;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 2. CLEAN OLD TABLES
-- ------------------------------------------------------------

DROP TABLE IF EXISTS rfq_activity;
DROP TABLE IF EXISTS rfq_categories;
DROP TABLE IF EXISTS quotations;
DROP TABLE IF EXISTS rfqs;
DROP TABLE IF EXISTS supplier_profiles;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- 3. USERS
-- ------------------------------------------------------------

CREATE TABLE users (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(190) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('BUYER', 'SUPPLIER') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_users_email (email),

    KEY idx_users_role (role),
    KEY idx_users_created_at (created_at),
    KEY idx_users_email_role (email, role),

    CONSTRAINT chk_users_name
        CHECK (CHAR_LENGTH(TRIM(name)) >= 2)

) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. SUPPLIER PROFILES
-- ------------------------------------------------------------

CREATE TABLE supplier_profiles (
    id INT NOT NULL AUTO_INCREMENT,
    supplier_id INT NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    company_description TEXT NULL,
    business_category VARCHAR(100) NULL,
    phone VARCHAR(30) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    website VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_supplier_profiles_supplier (supplier_id),

    KEY idx_supplier_profiles_company (company_name),
    KEY idx_supplier_profiles_category (business_category),
    KEY idx_supplier_profiles_city (city),

    CONSTRAINT fk_supplier_profiles_supplier
        FOREIGN KEY (supplier_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE

) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. CATEGORIES
-- ------------------------------------------------------------

CREATE TABLE categories (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_categories_name (name)

) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. RFQs
-- ------------------------------------------------------------

CREATE TABLE rfqs (
    id INT NOT NULL AUTO_INCREMENT,

    buyer_id INT NOT NULL,

    product_name VARCHAR(150) NOT NULL,

    description TEXT NOT NULL,

    quantity DECIMAL(12,2) NOT NULL,

    delivery_location VARCHAR(255) NOT NULL,

    deadline DATE NOT NULL,

    status ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_rfqs_buyer_id (buyer_id),

    KEY idx_rfqs_status (status),

    KEY idx_rfqs_deadline (deadline),

    KEY idx_rfqs_status_deadline (status, deadline),

    KEY idx_rfqs_location (delivery_location),

    KEY idx_rfqs_product_name (product_name),

    KEY idx_rfqs_created_at (created_at),

    KEY idx_rfqs_buyer_status (buyer_id, status),

    CONSTRAINT fk_rfqs_buyer
        FOREIGN KEY (buyer_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_rfqs_quantity_positive
        CHECK (quantity > 0),

    CONSTRAINT chk_rfqs_product_name
        CHECK (CHAR_LENGTH(TRIM(product_name)) >= 2),

    CONSTRAINT chk_rfqs_description
        CHECK (CHAR_LENGTH(TRIM(description)) >= 10),

    CONSTRAINT chk_rfqs_location
        CHECK (CHAR_LENGTH(TRIM(delivery_location)) >= 1)

) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. RFQ ↔ CATEGORY MANY-TO-MANY TABLE
-- ------------------------------------------------------------

CREATE TABLE rfq_categories (
    rfq_id INT NOT NULL,
    category_id INT NOT NULL,

    PRIMARY KEY (rfq_id, category_id),

    KEY idx_rfq_categories_category (category_id),

    CONSTRAINT fk_rfq_categories_rfq
        FOREIGN KEY (rfq_id)
        REFERENCES rfqs(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_rfq_categories_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE

) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. QUOTATIONS
-- ------------------------------------------------------------

CREATE TABLE quotations (
    id INT NOT NULL AUTO_INCREMENT,

    rfq_id INT NOT NULL,

    supplier_id INT NOT NULL,

    quoted_price DECIMAL(14,2) NOT NULL,

    estimated_delivery_days INT NOT NULL,

    message TEXT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_quotations_rfq_supplier
        (rfq_id, supplier_id),

    KEY idx_quotations_rfq_id (rfq_id),

    KEY idx_quotations_supplier_id (supplier_id),

    KEY idx_quotations_created_at (created_at),

    KEY idx_quotations_price (quoted_price),

    KEY idx_quotations_rfq_price
        (rfq_id, quoted_price),

    CONSTRAINT fk_quotations_rfq
        FOREIGN KEY (rfq_id)
        REFERENCES rfqs(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_quotations_supplier
        FOREIGN KEY (supplier_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_quotations_price
        CHECK (quoted_price >= 0),

    CONSTRAINT chk_quotations_delivery
        CHECK (estimated_delivery_days > 0),

    CONSTRAINT chk_quotations_message
        CHECK (
            message IS NULL
            OR CHAR_LENGTH(message) <= 2000
        )

) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 9. RFQ ACTIVITY / AUDIT LOG
-- ------------------------------------------------------------

CREATE TABLE rfq_activity (
    id INT NOT NULL AUTO_INCREMENT,

    rfq_id INT NOT NULL,

    user_id INT NOT NULL,

    action_type ENUM(
        'CREATED',
        'UPDATED',
        'CLOSED',
        'QUOTATION_SUBMITTED',
        'VIEWED'
    ) NOT NULL,

    description VARCHAR(500) NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_rfq_activity_rfq (rfq_id),

    KEY idx_rfq_activity_user (user_id),

    KEY idx_rfq_activity_action (action_type),

    KEY idx_rfq_activity_created (created_at),

    CONSTRAINT fk_rfq_activity_rfq
        FOREIGN KEY (rfq_id)
        REFERENCES rfqs(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_rfq_activity_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE

) ENGINE=InnoDB;

-- ============================================================
-- 10. MASTER CATEGORIES
-- ============================================================

INSERT INTO categories
(name, description)
VALUES

('IT Hardware',
 'Computers, laptops, networking equipment and accessories'),

('Software',
 'Software licenses, SaaS products and enterprise applications'),

('Industrial Equipment',
 'Industrial machinery and production equipment'),

('Office Supplies',
 'Office furniture, stationery and workplace supplies'),

('Construction',
 'Construction materials and related services'),

('Logistics',
 'Transportation, warehousing and logistics services'),

('Electrical',
 'Electrical products, components and equipment'),

('Automotive',
 'Automotive components and vehicle-related products'),

('Professional Services',
 'Consulting, development and professional business services'),

('Security',
 'Security hardware, surveillance and security services');

-- ============================================================
-- 11. DEMO USERS
-- ============================================================
--
-- Password for all demo accounts:
--
-- Password@123
--
-- ============================================================

INSERT INTO users
(name, email, password_hash, role)
VALUES

(
    'Mahendra Buyer',
    'buyer1@rfqmarketplace.com',
    'pbkdf2:sha256:600000$b2brfq2026$Q/wGX2bsCX2WHxUu2xinqOhY/uLee/ZhQbbpZukz6kY',
    'BUYER'
),

(
    'Acme Procurement',
    'buyer2@rfqmarketplace.com',
    'pbkdf2:sha256:600000$b2brfq2026$Q/wGX2bsCX2WHxUu2xinqOhY/uLee/ZhQbbpZukz6kY',
    'BUYER'
),

(
    'Global Purchase Team',
    'buyer3@rfqmarketplace.com',
    'pbkdf2:sha256:600000$b2brfq2026$Q/wGX2bsCX2WHxUu2xinqOhY/uLee/ZhQbbpZukz6kY',
    'BUYER'
),

(
    'Tech Supplier',
    'supplier1@rfqmarketplace.com',
    'pbkdf2:sha256:600000$b2brfq2026$Q/wGX2bsCX2WHxUu2xinqOhY/uLee/ZhQbbpZukz6kY',
    'SUPPLIER'
),

(
    'Prime Industrial',
    'supplier2@rfqmarketplace.com',
    'pbkdf2:sha256:600000$b2brfq2026$Q/wGX2bsCX2WHxUu2xinqOhY/uLee/ZhQbbpZukz6kY',
    'SUPPLIER'
),

(
    'Smart Systems',
    'supplier3@rfqmarketplace.com',
    'pbkdf2:sha256:600000$b2brfq2026$Q/wGX2bsCX2WHxUu2xinqOhY/uLee/ZhQbbpZukz6kY',
    'SUPPLIER'
),

(
    'BuildRight Supplies',
    'supplier4@rfqmarketplace.com',
    'pbkdf2:sha256:600000$b2brfq2026$Q/wGX2bsCX2WHxUu2xinqOhY/uLee/ZhQbbpZukz6kY',
    'SUPPLIER'
),

(
    'Enterprise Vendor',
    'supplier5@rfqmarketplace.com',
    'pbkdf2:sha256:600000$b2brfq2026$Q/wGX2bsCX2WHxUu2xinqOhY/uLee/ZhQbbpZukz6kY',
    'SUPPLIER'
);

-- ============================================================
-- 12. SUPPLIER PROFILES
-- ============================================================

INSERT INTO supplier_profiles
(
    supplier_id,
    company_name,
    company_description,
    business_category,
    phone,
    city,
    state,
    website
)
VALUES

(
    4,
    'Tech Supplier Pvt Ltd',
    'Supplier of enterprise laptops, computers and networking equipment.',
    'IT Hardware',
    '+91-9000000001',
    'Hyderabad',
    'Telangana',
    'https://example.com'
),

(
    5,
    'Prime Industrial Solutions',
    'Industrial equipment and machinery supplier serving Indian businesses.',
    'Industrial Equipment',
    '+91-9000000002',
    'Hyderabad',
    'Telangana',
    'https://example.com'
),

(
    6,
    'Smart Systems India',
    'Enterprise software, cloud and IT infrastructure provider.',
    'Software',
    '+91-9000000003',
    'Bengaluru',
    'Karnataka',
    'https://example.com'
),

(
    7,
    'BuildRight Supplies',
    'Construction and electrical material supplier.',
    'Construction',
    '+91-9000000004',
    'Chennai',
    'Tamil Nadu',
    'https://example.com'
),

(
    8,
    'Enterprise Vendor',
    'Business products and professional procurement services.',
    'Professional Services',
    '+91-9000000005',
    'Pune',
    'Maharashtra',
    'https://example.com'
);

-- ============================================================
-- 13. DEMO RFQs
-- ============================================================

INSERT INTO rfqs
(
    buyer_id,
    product_name,
    description,
    quantity,
    delivery_location,
    deadline,
    status
)
VALUES

(
    1,
    'Business Laptops',
    'Need business laptops for employees with minimum 16GB RAM, 512GB SSD and current generation processors.',
    50,
    'Hyderabad',
    '2026-09-28',
    'OPEN'
),

(
    1,
    'Office Monitors',
    'Require 24-inch IPS monitors suitable for office productivity and long working hours.',
    80,
    'Hyderabad',
    '2026-10-02',
    'OPEN'
),

(
    1,
    'Network Switches',
    'Require managed Gigabit network switches for an enterprise office infrastructure.',
    20,
    'Hyderabad',
    '2026-10-05',
    'OPEN'
),

(
    2,
    'ERP Software Licenses',
    'Looking for enterprise ERP software licenses for finance, procurement and inventory operations.',
    25,
    'Bengaluru',
    '2026-10-08',
    'OPEN'
),

(
    2,
    'Office Chairs',
    'Need ergonomic office chairs suitable for a technology office environment.',
    120,
    'Bengaluru',
    '2026-10-01',
    'OPEN'
),

(
    2,
    'Warehouse Barcode Scanners',
    'Require handheld barcode scanners for warehouse inventory management.',
    35,
    'Chennai',
    '2026-10-10',
    'OPEN'
),

(
    3,
    'Industrial Pumps',
    'Need industrial water pumps for a manufacturing facility with installation support.',
    12,
    'Pune',
    '2026-10-12',
    'OPEN'
),

(
    3,
    'Electrical Panels',
    'Supply and installation of electrical control panels for a commercial project.',
    10,
    'Hyderabad',
    '2026-10-15',
    'OPEN'
),

(
    1,
    'CCTV Security Cameras',
    'Require IP-based CCTV cameras for an office campus including installation accessories.',
    60,
    'Hyderabad',
    '2026-09-30',
    'OPEN'
),

(
    2,
    'Cloud Migration Services',
    'Need professional cloud migration services for existing business applications.',
    1,
    'Bengaluru',
    '2026-10-20',
    'OPEN'
),

(
    3,
    'Office Desks',
    'Require modular office desks suitable for a newly established corporate office.',
    75,
    'Chennai',
    '2026-10-18',
    'OPEN'
),

(
    3,
    'Logistics Services',
    'Need scheduled business logistics and transportation services between multiple cities.',
    1,
    'Hyderabad',
    '2026-10-25',
    'OPEN'
),

(
    1,
    'Developer Workstations',
    'Require high performance workstations for software development and machine learning workloads.',
    15,
    'Hyderabad',
    '2026-10-06',
    'OPEN'
),

(
    2,
    'Printer Devices',
    'Need multifunction laser printers for multiple office departments.',
    18,
    'Bengaluru',
    '2026-10-04',
    'OPEN'
),

(
    3,
    'Fire Safety Equipment',
    'Require fire extinguishers and related workplace fire safety equipment.',
    40,
    'Pune',
    '2026-10-14',
    'OPEN'
);

-- ============================================================
-- 14. RFQ CATEGORIES
-- ============================================================

INSERT INTO rfq_categories
(rfq_id, category_id)
VALUES

(1, 1),
(2, 1),
(3, 1),
(4, 2),
(5, 4),
(6, 1),
(7, 3),
(8, 7),
(9, 10),
(10, 9),
(11, 4),
(12, 6),
(13, 1),
(14, 1),
(15, 10);

-- ============================================================
-- 15. DEMO QUOTATIONS
-- ============================================================

INSERT INTO quotations
(
    rfq_id,
    supplier_id,
    quoted_price,
    estimated_delivery_days,
    message
)
VALUES

(
    1,
    4,
    4250000.00,
    7,
    'We can supply all 50 laptops with enterprise warranty and doorstep delivery.'
),

(
    1,
    6,
    4185000.00,
    10,
    'We can provide the requested configuration with three-year business support.'
),

(
    2,
    4,
    760000.00,
    6,
    'Available for immediate dispatch with manufacturer warranty.'
),

(
    3,
    4,
    295000.00,
    8,
    'Managed Gigabit switches available with configuration support.'
),

(
    4,
    6,
    1450000.00,
    15,
    'Enterprise ERP licensing proposal with implementation support.'
),

(
    5,
    7,
    540000.00,
    12,
    'Ergonomic chairs available with onsite delivery and installation.'
),

(
    6,
    4,
    315000.00,
    10,
    'Barcode scanners with charging docks and one-year warranty.'
),

(
    7,
    5,
    980000.00,
    18,
    'Industrial pump supply including installation and commissioning.'
),

(
    8,
    5,
    650000.00,
    20,
    'Electrical panels can be supplied and installed according to specification.'
),

(
    9,
    4,
    510000.00,
    9,
    'IP CCTV package including cameras, NVR and installation accessories.'
),

(
    10,
    6,
    1250000.00,
    30,
    'Complete cloud migration assessment and implementation services.'
),

(
    11,
    7,
    475000.00,
    14,
    'Modular office desks available with installation support.'
),

(
    12,
    8,
    185000.00,
    5,
    'We provide scheduled B2B logistics and multi-city transportation services.'
),

(
    13,
    4,
    1320000.00,
    12,
    'High-performance developer workstations available with onsite warranty.'
),

(
    14,
    6,
    325000.00,
    9,
    'Multifunction laser printers supplied with installation and maintenance support.'
);

-- ============================================================
-- 16. RFQ ACTIVITY
-- ============================================================

INSERT INTO rfq_activity
(
    rfq_id,
    user_id,
    action_type,
    description
)
VALUES

(1, 1, 'CREATED', 'RFQ created by buyer.'),
(2, 1, 'CREATED', 'RFQ created by buyer.'),
(3, 1, 'CREATED', 'RFQ created by buyer.'),
(4, 2, 'CREATED', 'RFQ created by buyer.'),
(5, 2, 'CREATED', 'RFQ created by buyer.'),
(6, 2, 'CREATED', 'RFQ created by buyer.'),
(7, 3, 'CREATED', 'RFQ created by buyer.'),
(8, 3, 'CREATED', 'RFQ created by buyer.'),
(9, 1, 'CREATED', 'RFQ created by buyer.'),
(10, 2, 'CREATED', 'RFQ created by buyer.'),
(11, 3, 'CREATED', 'RFQ created by buyer.'),
(12, 3, 'CREATED', 'RFQ created by buyer.'),
(13, 1, 'CREATED', 'RFQ created by buyer.'),
(14, 2, 'CREATED', 'RFQ created by buyer.'),
(15, 3, 'CREATED', 'RFQ created by buyer.'),

(1, 4, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.'),
(1, 6, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.'),
(2, 4, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.'),
(3, 4, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.'),
(4, 6, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.'),
(5, 7, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.'),
(6, 4, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.'),
(7, 5, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.'),
(8, 5, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.'),
(9, 4, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.'),
(10, 6, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.'),
(11, 7, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.'),
(12, 8, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.'),
(13, 4, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.'),
(14, 6, 'QUOTATION_SUBMITTED', 'Supplier submitted quotation.');

-- ============================================================
-- 17. PERFORMANCE / REPORTING VIEWS
-- ============================================================

DROP VIEW IF EXISTS vw_open_rfqs;

CREATE VIEW vw_open_rfqs AS
SELECT
    r.id,
    r.product_name,
    r.description,
    r.quantity,
    r.delivery_location,
    r.deadline,
    r.status,
    r.created_at,
    u.name AS buyer_name,
    u.email AS buyer_email,
    COUNT(q.id) AS quotation_count
FROM rfqs r
JOIN users u
    ON r.buyer_id = u.id
LEFT JOIN quotations q
    ON q.rfq_id = r.id
WHERE r.status = 'OPEN'
GROUP BY
    r.id,
    r.product_name,
    r.description,
    r.quantity,
    r.delivery_location,
    r.deadline,
    r.status,
    r.created_at,
    u.name,
    u.email;

DROP VIEW IF EXISTS vw_rfq_quotation_summary;

CREATE VIEW vw_rfq_quotation_summary AS
SELECT
    r.id AS rfq_id,
    r.product_name,
    r.delivery_location,
    r.deadline,
    r.status,
    COUNT(q.id) AS quotation_count,
    MIN(q.quoted_price) AS lowest_quote,
    MAX(q.quoted_price) AS highest_quote,
    AVG(q.quoted_price) AS average_quote
FROM rfqs r
LEFT JOIN quotations q
    ON q.rfq_id = r.id
GROUP BY
    r.id,
    r.product_name,
    r.delivery_location,
    r.deadline,
    r.status;

DROP VIEW IF EXISTS vw_supplier_quotation_summary;

CREATE VIEW vw_supplier_quotation_summary AS
SELECT
    u.id AS supplier_id,
    u.name AS supplier_name,
    u.email AS supplier_email,
    COUNT(q.id) AS total_quotations,
    COALESCE(SUM(q.quoted_price), 0) AS total_quoted_value,
    COALESCE(AVG(q.quoted_price), 0) AS average_quotation
FROM users u
LEFT JOIN quotations q
    ON q.supplier_id = u.id
WHERE u.role = 'SUPPLIER'
GROUP BY
    u.id,
    u.name,
    u.email;

-- ============================================================
-- 18. VERIFICATION
-- ============================================================

SELECT 'DATABASE READY' AS status;

SELECT
    COUNT(*) AS total_users
FROM users;

SELECT
    COUNT(*) AS total_buyers
FROM users
WHERE role = 'BUYER';

SELECT
    COUNT(*) AS total_suppliers
FROM users
WHERE role = 'SUPPLIER';

SELECT
    COUNT(*) AS total_rfqs
FROM rfqs;

SELECT
    COUNT(*) AS open_rfqs
FROM rfqs
WHERE status = 'OPEN';

SELECT
    COUNT(*) AS total_quotations
FROM quotations;

SELECT
    COUNT(*) AS total_categories
FROM categories;

-- ============================================================
-- 19. USEFUL TEST QUERIES
-- ============================================================

-- All available RFQs
-- SELECT * FROM vw_open_rfqs ORDER BY deadline;

-- RFQs with quotation statistics
-- SELECT * FROM vw_rfq_quotation_summary ORDER BY quotation_count DESC;

-- Supplier quotation statistics
-- SELECT * FROM vw_supplier_quotation_summary ORDER BY total_quotations DESC;

-- Lowest quotations
-- SELECT
--     r.product_name,
--     u.name AS supplier,
--     q.quoted_price,
--     q.estimated_delivery_days
-- FROM quotations q
-- JOIN rfqs r ON q.rfq_id = r.id
-- JOIN users u ON q.supplier_id = u.id
-- ORDER BY q.quoted_price ASC;

-- ============================================================
-- END
-- ============================================================