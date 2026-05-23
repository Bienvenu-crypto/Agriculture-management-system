const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../agrobot.db');
const db = new Database(dbPath);

const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='trades'").get();
console.log("Trades Table SQL:");
console.log(tableInfo.sql);

const indexes = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='trades'").all();
console.log("\nTrades Indexes:");
console.log(indexes);

db.close();
