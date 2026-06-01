import Database from 'better-sqlite3';

const db = new Database('agrobot.db');
db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
db.exec('PRAGMA journal_mode=DELETE');
db.close();

console.log('Done! WAL merged into agrobot.db');