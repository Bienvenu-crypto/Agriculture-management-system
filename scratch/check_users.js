const sqlite3 = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '../agrobot.db');
const db = new sqlite3(dbPath);
try {
    const users = db.prepare('SELECT id, name, email, phone, role FROM marketplace_users LIMIT 20').all();
    console.log('Marketplace Users:', JSON.stringify(users, null, 2));
} catch (e) {
    console.error(e);
}
db.close();
