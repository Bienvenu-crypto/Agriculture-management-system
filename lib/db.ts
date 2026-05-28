import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'agrobot.db');

// Singleton pattern for database connection
const globalForDb = global as unknown as { db: Database.Database | undefined };

export const db = globalForDb.db ?? new Database(dbPath);

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');
// Faster synchronous mode for WAL
db.pragma('synchronous = NORMAL');
// Enable foreign key constraints
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    district TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_email TEXT,
    session_id TEXT,
    role TEXT,
    content TEXT,
    image_url TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS market_prices_cache (
    crop_name TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS weather_cache (
    location_key TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS marketplace_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    district TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('seller', 'buyer')),
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_users_email_role ON marketplace_users(email, role);

  CREATE TABLE IF NOT EXISTS marketplace_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES marketplace_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    crop TEXT NOT NULL,
    quantity_kg REAL NOT NULL,
    price_per_kg REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'UGX',
    description TEXT,
    category TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'sold', 'cancelled')),
    is_promoted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES marketplace_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS buy_orders (
    id TEXT PRIMARY KEY,
    buyer_id TEXT NOT NULL,
    crop TEXT NOT NULL,
    quantity_kg REAL NOT NULL,
    max_price_per_kg REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'UGX',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'fulfilled', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES marketplace_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    buy_order_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    crop TEXT NOT NULL,
    quantity_kg REAL NOT NULL,
    agreed_price_per_kg REAL NOT NULL,
    total_value REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'UGX',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in-transit', 'completed', 'disputed')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'pending', 'paid')),
    payment_method TEXT,
    payment_phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    FOREIGN KEY (buy_order_id) REFERENCES buy_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES marketplace_users(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES marketplace_users(id) ON DELETE CASCADE
  );

  -- Create indexes for better query performance
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_chats_user_email ON chats(user_email);
  CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
  CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);
  CREATE INDEX IF NOT EXISTS idx_listings_crop ON listings(crop);
  CREATE INDEX IF NOT EXISTS idx_buy_orders_buyer ON buy_orders(buyer_id);
  CREATE INDEX IF NOT EXISTS idx_buy_orders_crop ON buy_orders(crop);
  CREATE INDEX IF NOT EXISTS idx_trades_seller ON trades(seller_id);
  CREATE INDEX IF NOT EXISTS idx_trades_buyer ON trades(buyer_id);
  CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_user ON marketplace_sessions(user_id);

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT, -- Can be null for system-wide or app-user email
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
  CREATE TABLE IF NOT EXISTS crop_calendars (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    crop TEXT NOT NULL,
    planting_date TEXT NOT NULL,
    region TEXT NOT NULL,
    data_json TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_crop_calendars_user ON crop_calendars(user_email);

  CREATE TABLE IF NOT EXISTS weather_cache (
    location_key TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS market_prices_cache (
    crop_name TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    moisture REAL,
    temperature REAL,
    ph REAL,
    battery_level REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS marketplace_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('impression', 'click')),
    listing_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES marketplace_users(id) ON DELETE CASCADE
  );
`);

try {
  db.exec('ALTER TABLE users ADD COLUMN district TEXT');
} catch (e) { }

try {
  db.exec('ALTER TABLE trades ADD COLUMN completed_at DATETIME');
} catch (e) { }

try {
  db.exec('ALTER TABLE chats ADD COLUMN timestamp DATETIME DEFAULT CURRENT_TIMESTAMP');
} catch (e) { }

try {
  db.exec("ALTER TABLE listings ADD COLUMN currency TEXT NOT NULL DEFAULT 'UGX'");
  db.exec("ALTER TABLE buy_orders ADD COLUMN currency TEXT NOT NULL DEFAULT 'UGX'");
  db.exec("ALTER TABLE trades ADD COLUMN currency TEXT NOT NULL DEFAULT 'UGX'");
  db.exec('ALTER TABLE trades ADD COLUMN payment_status TEXT NOT NULL DEFAULT "unpaid"');
  db.exec('ALTER TABLE trades ADD COLUMN payment_method TEXT');
  db.exec('ALTER TABLE trades ADD COLUMN payment_phone TEXT');
} catch (e) { }

try {
  db.exec('ALTER TABLE marketplace_users ADD COLUMN is_subscribed INTEGER DEFAULT 0');
} catch (e) { }

try {
  db.exec('ALTER TABLE listings ADD COLUMN is_promoted INTEGER DEFAULT 0');
} catch (e) { }

try {
  db.exec('ALTER TABLE listings ADD COLUMN category TEXT');
} catch (e) { }

try {
  db.exec('ALTER TABLE listings ADD COLUMN image_url TEXT');
} catch (e) { }

export default db;
