import { LowSync, JSONFileSync } from 'lowdb';

type Data = { retrievedFiles: any[]; uploadFiles: number };

const db = new LowSync<Data>(new JSONFileSync<Data>('db.json'));
db.data = db.data ?? {
  retrievedFiles: [],
  uploadFiles: 0,
};

export default db;
