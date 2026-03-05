CREATE DATABASE IF NOT EXISTS eventara_db;
USE eventara_db;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','organizer','attendee') DEFAULT 'attendee',
  phone VARCHAR(20),
  avatar_url VARCHAR(255),
  bio TEXT,
  organization_name VARCHAR(150),
  organization_logo VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  total_points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(250) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  tagline VARCHAR(300),
  description TEXT NOT NULL,
  category ENUM('concert','conference','workshop','sports','festival','networking','webinar','exhibition','comedy','other') NOT NULL,
  format ENUM('in-person','virtual','hybrid') DEFAULT 'in-person',
  status ENUM('draft','published','cancelled','completed') DEFAULT 'draft',
  banner_url VARCHAR(255),
  venue_name VARCHAR(200),
  venue_address TEXT,
  venue_city VARCHAR(100),
  venue_lat DECIMAL(10,7),
  venue_lng DECIMAL(10,7),
  virtual_link VARCHAR(500),
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  registration_deadline DATETIME,
  organizer_id INT NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE,
  min_age INT DEFAULT 0,
  tags VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE ticket_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,        /* General, VIP, VVIP, Early Bird, etc. */
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_quantity INT NOT NULL,
  sold_quantity INT DEFAULT 0,
  max_per_booking INT DEFAULT 10,
  sale_start DATETIME,
  sale_end DATETIME,
  perks TEXT,                         /* JSON array of perk strings */
  color VARCHAR(20) DEFAULT '#7c3aed',
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_ref VARCHAR(20) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  status ENUM('pending','confirmed','cancelled','refund_requested','refunded') DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('card','upi','wallet','free') DEFAULT 'free',
  payment_status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
  coupon_code VARCHAR(50),
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_code VARCHAR(50) UNIQUE NOT NULL,
  booking_id INT NOT NULL,
  ticket_type_id INT NOT NULL,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  attendee_name VARCHAR(100) NOT NULL,
  attendee_email VARCHAR(150) NOT NULL,
  qr_code_url VARCHAR(500),
  status ENUM('active','used','cancelled','transferred') DEFAULT 'active',
  checked_in_at DATETIME NULL,
  checked_in_by INT NULL,
  seat_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE booking_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  ticket_type_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id)
);

CREATE TABLE coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  event_id INT NULL,                  /* NULL = works for all events */
  discount_type ENUM('percent','flat') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  max_uses INT DEFAULT 100,
  used_count INT DEFAULT 0,
  valid_from DATETIME,
  valid_until DATETIME,
  min_booking_amount DECIMAL(10,2) DEFAULT 0,
  created_by INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(200),
  comment TEXT,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_review (user_id, event_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE waitlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  ticket_type_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notified BOOLEAN DEFAULT FALSE,
  UNIQUE KEY unique_waitlist (user_id, event_id, ticket_type_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('booking','event','ticket','system','reminder','refund') DEFAULT 'system',
  icon VARCHAR(10) DEFAULT '🔔',
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE saved_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_saved (user_id, event_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- SEED DATA
INSERT INTO users (full_name, email, password, role, is_verified) VALUES
('Super Admin', 'admin@eventara.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', TRUE),
('Demo Organizer', 'organizer@eventara.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'organizer', TRUE),
('Demo Attendee', 'attendee@eventara.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'attendee', TRUE);
-- All passwords: password
