import path from 'path';
import Database from 'better-sqlite3';

const dbPath = path.join(__dirname, '..', '..', 'nutrition.db');
const db = new Database(dbPath, { fileMustExist: true });
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

export default db;
