const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../agrobot.db');
const db = new Database(dbPath);

console.log("Starting migration on trades table...");

try {
  db.pragma('foreign_keys = OFF');
  
  db.transaction(() => {
    // 1. Create a temporary table with the correct check constraints and options
    db.prepare(`
      CREATE TABLE IF NOT EXISTS trades_new (
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
        completed_at DATETIME,
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
        FOREIGN KEY (buy_order_id) REFERENCES buy_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (seller_id) REFERENCES marketplace_users(id) ON DELETE CASCADE,
        FOREIGN KEY (buyer_id) REFERENCES marketplace_users(id) ON DELETE CASCADE
      )
    `).run();
    console.log("Created trades_new table.");

    // 2. Copy the existing data
    db.prepare(`
      INSERT INTO trades_new (
        id, listing_id, buy_order_id, seller_id, buyer_id, crop, quantity_kg, 
        agreed_price_per_kg, total_value, currency, status, payment_status, 
        payment_method, payment_phone, created_at, completed_at
      )
      SELECT 
        id, listing_id, buy_order_id, seller_id, buyer_id, crop, quantity_kg, 
        agreed_price_per_kg, total_value, currency, status, payment_status, 
        payment_method, payment_phone, created_at, completed_at
      FROM trades
    `).run();
    console.log("Copied trades data to trades_new.");

    // 3. Drop the old table
    db.prepare('DROP TABLE trades').run();
    console.log("Dropped old trades table.");

    // 4. Rename new table to old table name
    db.prepare('ALTER TABLE trades_new RENAME TO trades').run();
    console.log("Renamed trades_new to trades.");

    // 5. Recreate indexes
    db.prepare('CREATE INDEX IF NOT EXISTS idx_trades_seller ON trades(seller_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_trades_buyer ON trades(buyer_id)').run();
    console.log("Recreated indexes on trades table.");
  })();

  console.log("Migration completed successfully.");
} catch (error) {
  console.error("Migration failed:", error);
} finally {
  db.pragma('foreign_keys = ON');
  db.close();
}
