import Database from 'better-sqlite3';
const db = new Database('agrobot.db');
const tables = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
console.log(tables.map(t => t.sql).join(';\n\n') + ';');
