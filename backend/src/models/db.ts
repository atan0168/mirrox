import path from 'path';
import Database from 'better-sqlite3';

const dbPath = path.join(__dirname, '..', '..', 'nutrition.db');
const db: Database.Database = new Database(dbPath, {
  readonly: true,
  fileMustExist: true,
});

export default db;
