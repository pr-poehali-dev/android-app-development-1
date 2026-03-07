
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('passenger', 'driver', 'admin')),
  avatar TEXT,
  registered_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  login TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  car_brand TEXT NOT NULL DEFAULT '',
  car_model TEXT NOT NULL DEFAULT '',
  car_plate TEXT NOT NULL DEFAULT '',
  car_display TEXT NOT NULL DEFAULT '',
  rating NUMERIC(3,1) DEFAULT 5.0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'busy', 'restricted')),
  auto_assign BOOLEAN DEFAULT false,
  distance_km NUMERIC(6,1) DEFAULT 0,
  trips_count INTEGER DEFAULT 0,
  trips_last_24h INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 1,
  has_ads BOOLEAN DEFAULT false,
  subscription_days INTEGER DEFAULT 0,
  subscription_start TIMESTAMP,
  free_work BOOLEAN DEFAULT false,
  auto_assign_declines INTEGER DEFAULT 0,
  cancelled_orders INTEGER DEFAULT 0,
  auto_assign_trips INTEGER DEFAULT 0,
  free_trips INTEGER DEFAULT 0,
  total_earnings NUMERIC(12,2) DEFAULT 0,
  total_km NUMERIC(10,1) DEFAULT 0,
  total_hours NUMERIC(10,1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  passenger_id TEXT NOT NULL REFERENCES users(id),
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT,
  from_address TEXT NOT NULL DEFAULT '',
  to_address TEXT NOT NULL DEFAULT '',
  tariff TEXT NOT NULL CHECK (tariff IN ('economy', 'hourly', 'delivery')),
  children BOOLEAN DEFAULT false,
  children_count INTEGER DEFAULT 0,
  luggage BOOLEAN DEFAULT false,
  comment TEXT DEFAULT '',
  delivery_description TEXT,
  cargo_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'waiting', 'arrived', 'inprogress', 'done', 'cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer')),
  tips NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(5,2) DEFAULT 0,
  distance_km NUMERIC(6,1) DEFAULT 0,
  price NUMERIC(10,2),
  driver_id TEXT REFERENCES drivers(id),
  driver_name TEXT,
  driver_car TEXT,
  eta_minutes INTEGER,
  free_at TIMESTAMP,
  accepted_via TEXT CHECK (accepted_via IN ('auto', 'free')),
  cancelled_by TEXT CHECK (cancelled_by IN ('passenger', 'driver', 'admin')),
  scheduled_at TEXT,
  waiting_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  price_first_km NUMERIC(10,2) DEFAULT 80,
  price_per_km NUMERIC(10,2) DEFAULT 25,
  price_per_hour NUMERIC(10,2) DEFAULT 450,
  price_delivery NUMERIC(10,2) DEFAULT 300,
  price_waiting_per_min NUMERIC(10,2) DEFAULT 5,
  auto_assign_radius_km NUMERIC(6,1) DEFAULT 5,
  free_order_timeout_ms INTEGER DEFAULT 240000,
  global_discount NUMERIC(5,2) DEFAULT 0,
  km_discount_threshold NUMERIC(6,1) DEFAULT 4,
  km_discount NUMERIC(5,2) DEFAULT 0,
  auto_assign_mode TEXT DEFAULT 'rating' CHECK (auto_assign_mode IN ('rating', 'trips', 'ads')),
  time_coefficients JSONB DEFAULT '[{"from":22,"to":6,"coeff":1.5},{"from":7,"to":9,"coeff":1.3},{"from":17,"to":19,"coeff":1.2}]',
  admin_password TEXT DEFAULT 'admin75reg',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_role TEXT NOT NULL CHECK (from_role IN ('passenger', 'driver', 'admin')),
  text TEXT NOT NULL,
  time TEXT NOT NULL,
  msg_timestamp BIGINT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, name, phone, role) VALUES ('admin_1', 'Администратор', '', 'admin') ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_orders_passenger ON orders(passenger_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_support_from ON support_messages(from_id);
