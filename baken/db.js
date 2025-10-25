const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'barbe.db');

async function openDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

// simple wrapper to expose common methods
const dbProxy = {
  async run(sql, params = []) {
    const db = await openDb();
    const res = await db.run(sql, params);
    await db.close();
    return res;
  },
  async all(sql, params = []) {
    const db = await openDb();
    const res = await db.all(sql, params);
    await db.close();
    return res;
  },
  async get(sql, params = []) {
    const db = await openDb();
    const res = await db.get(sql, params);
    await db.close();
    return res;
  }
};

// Initialize DB with schema if needed
(async () => {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      service TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed services if empty
  const count = await db.get('SELECT COUNT(1) as c FROM services');
  if (count.c === 0) {
    await db.run('INSERT INTO services (title, description, price) VALUES (?, ?, ?)', ['Corte', 'Corte de pelo con estilo', 25]);
    await db.run('INSERT INTO services (title, description, price) VALUES (?, ?, ?)', ['Barba', 'Afeitado y arreglo de barba', 15]);
    await db.run('INSERT INTO services (title, description, price) VALUES (?, ?, ?)', ['Corte + Barba', 'Paquete completo de corte y barba', 35]);
    await db.run('INSERT INTO services (title, description, price) VALUES (?, ?, ?)', ['Tinte', 'Tinte de pelo profesional', 40]);
  }

  await db.close();
})();

module.exports = dbProxy;
