-- Contact Submissions Table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  subject VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR(100) NOT NULL,
  user_id UUID,
  session_id UUID NOT NULL,
  page_url VARCHAR(500),
  event_data JSONB,
  user_properties JSONB,
  country VARCHAR(100),
  browser VARCHAR(100),
  device_type VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_name (event_name),
  INDEX idx_timestamp (timestamp),
  INDEX idx_session_id (session_id)
);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

-- Payment History Table
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_payment_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  subject VARCHAR(255) NOT NULL,
  template_html TEXT NOT NULL,
  template_text TEXT,
  variables JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Activity Logs Table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_id (admin_id),
  INDEX idx_created_at (created_at)
);
