-- SQL Migrations for SwiftPay Backend
-- Run these migrations in order

-- 1. Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    reset_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    CONSTRAINT one_active_reset_per_user UNIQUE (user_id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- 2. Create beneficiaries table
CREATE TABLE IF NOT EXISTS beneficiaries (
    beneficiary_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    beneficiary_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    nickname VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_beneficiary CHECK (user_id != beneficiary_user_id),
    UNIQUE(user_id, beneficiary_user_id)
);

CREATE INDEX idx_beneficiaries_user_id ON beneficiaries(user_id);
CREATE INDEX idx_beneficiaries_beneficiary_user_id ON beneficiaries(beneficiary_user_id);

-- 3. Add currency support to wallets if not exists
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- 4. Update transactions table to support transfer types
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transfer_type VARCHAR(20);
-- Possible values: 'deposit', 'withdrawal', 'transfer', 'transfer_received'

-- 5. Create transaction_limits table for user limits tracking
CREATE TABLE IF NOT EXISTS transaction_limits (
    limit_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    daily_limit DECIMAL(15, 2) DEFAULT 5000,
    monthly_limit DECIMAL(15, 2) DEFAULT 50000,
    single_transaction_max DECIMAL(15, 2) DEFAULT 1000,
    daily_used TODAY DECIMAL(15, 2) DEFAULT 0,
    monthly_used DECIMAL(15, 2) DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaction_limits_user_id ON transaction_limits(user_id);

-- 6. Create user_preferences extended table if not exists
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'fr';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'light';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;

-- 7. Add audit_logs table for security
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- 8. Add session tracking table
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE,
    ip_address VARCHAR(50),
    user_agent TEXT,
    device_name VARCHAR(100),
    expires_at TIMESTAMP NOT NULL,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
