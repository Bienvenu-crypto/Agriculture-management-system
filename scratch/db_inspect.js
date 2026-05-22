const db = require('better-sqlite3')('agrobot.db');
console.log('--- MARKETPLACE USERS ---');
const users = db.prepare('SELECT id, name, email, role, is_subscribed FROM marketplace_users').all();
console.log(users);

console.log('\n--- LISTINGS ---');
const listings = db.prepare('SELECT id, seller_id, crop, quantity_kg, price_per_kg, status FROM listings').all();
console.log(listings);
