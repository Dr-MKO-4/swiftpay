-- backend/migrations_phase2.sql

-- Table pour les taux de change en cache
CREATE TABLE IF NOT EXISTS currency_rates (
  id SERIAL PRIMARY KEY,
  base_currency VARCHAR(3) NOT NULL UNIQUE,
  rates JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_currency_base ON currency_rates(base_currency);

-- Table pour les tokens FCM (Firebase Cloud Messaging)
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_info TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, token)
);

CREATE INDEX idx_fcm_user ON fcm_tokens(user_id);
CREATE INDEX idx_fcm_active ON fcm_tokens(active);

-- Table pour les notifications (history)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  type VARCHAR(50) DEFAULT 'push',
  data JSONB,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days'
);

CREATE INDEX idx_notification_user ON notifications(user_id);
CREATE INDEX idx_notification_read ON notifications(read);
CREATE INDEX idx_notification_created ON notifications(created_at DESC);

-- Alter transactions pour supporter multi-devise
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS original_amount DECIMAL(15, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4);

-- Table pour l'audit des conversions
CREATE TABLE IF NOT EXISTS currency_conversions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  from_amount DECIMAL(15, 2) NOT NULL,
  to_amount DECIMAL(15, 2) NOT NULL,
  exchange_rate DECIMAL(10, 4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversion_user ON currency_conversions(user_id);
CREATE INDEX idx_conversion_date ON currency_conversions(created_at DESC);

-- Table pour les PDF générés (tracking)
CREATE TABLE IF NOT EXISTS pdf_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pdf_type VARCHAR(50) NOT NULL,
  pdf_month INTEGER,
  pdf_year INTEGER,
  filename VARCHAR(255),
  file_path TEXT,
  download_count INTEGER DEFAULT 0,
  last_download_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days'
);

CREATE INDEX idx_pdf_user ON pdf_requests(user_id);
CREATE INDEX idx_pdf_created ON pdf_requests(created_at DESC);

-- Update user_preferences pour dark mode
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT false;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"transaction": true, "security": true, "promotional": false}'::jsonb;

-- Activer extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
