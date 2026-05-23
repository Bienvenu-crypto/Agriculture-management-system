const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, '../agrobot.db');
const db = new Database(dbPath);

console.log("DB Path:", dbPath);

try {
  // Let's get the trades
  const trades = db.prepare('SELECT * FROM trades LIMIT 5').all();
  console.log("Existing trades:", trades);

  if (trades.length > 0) {
    const trade = trades[0];
    const status = 'in-transit';
    const id = trade.id;
    const user_id = trade.seller_id;
    const otherId = trade.buyer_id;
    const roleLabel = 'Seller';

    console.log(`Simulating trade status update to 'in-transit' for trade id: ${id}`);
    
    // Start transaction to not commit actual changes during debug
    db.transaction(() => {
      db.prepare('UPDATE trades SET status = ? WHERE id = ?').run(status, id);
      console.log("Updated trade status successfully.");

      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message) 
        VALUES (?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(), 
        otherId, 
        'trade_update', 
        'Trade Status Updated', 
        `The ${roleLabel} has marked the ${trade.crop} trade as ${status}.`
      );
      console.log("Inserted notification successfully.");
    })();
  } else {
    console.log("No trades found in database to simulate patch on.");
  }
} catch (error) {
  console.error("Error occurred:", error);
}
db.close();
