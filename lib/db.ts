import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import bcrypt from 'bcrypt';

let db: Database | null = null;

export async function getDb() {
  if (!db) {
    db = await open({
      filename: path.join(process.cwd(), 'database.sqlite'),
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS raffles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        announcement_text TEXT,
        title TEXT NOT NULL,
        description TEXT,
        prize TEXT NOT NULL,
        prize_count INTEGER NOT NULL,
        max_participants INTEGER,
        end_date TEXT NOT NULL,
        announcement_message_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS raffle_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raffle_id INTEGER NOT NULL,
        telegram_id INTEGER NOT NULL,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        ip_address TEXT NOT NULL,
        joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (raffle_id) REFERENCES raffles(id) ON DELETE CASCADE,
        UNIQUE(raffle_id, telegram_id)
      );

      CREATE TABLE IF NOT EXISTS raffle_winners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raffle_id INTEGER NOT NULL,
        participant_id INTEGER NOT NULL,
        prize_amount TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (raffle_id) REFERENCES raffles(id),
        FOREIGN KEY (participant_id) REFERENCES raffle_participants(id)
      )
    `);

    // Check and add missing columns if needed
    await migrateParticipantsTable();

    // Create default admin account if it doesn't exist
    const adminExists = await db.get('SELECT * FROM admins WHERE username = ?', 'admin');
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.run(
        'INSERT INTO admins (username, password) VALUES (?, ?)',
        ['admin', hashedPassword]
      );
      console.log('Default admin account created');
    }
  }
  return db;
}

async function migrateParticipantsTable() {
  const db = await getDb();
  const tableInfo = await db.all("PRAGMA table_info(raffle_participants)");
  const columns = tableInfo.map(col => col.name);

  const requiredColumns = [
    { name: 'username', type: 'TEXT' },
    { name: 'first_name', type: 'TEXT' },
    { name: 'last_name', type: 'TEXT' },
  ];

  for (const column of requiredColumns) {
    if (!columns.includes(column.name)) {
      console.log(`Adding missing column ${column.name} to raffle_participants table`);
      await db.exec(`ALTER TABLE raffle_participants ADD COLUMN ${column.name} ${column.type}`);
    }
  }

  // Додаємо колонку announcement_message_id до таблиці raffles, якщо її ще немає
  const rafflesTableInfo = await db.all("PRAGMA table_info(raffles)");
  const rafflesColumns = rafflesTableInfo.map(col => col.name);

  if (!rafflesColumns.includes('announcement_message_id')) {
    console.log('Adding missing column announcement_message_id to raffles table');
    await db.exec('ALTER TABLE raffles ADD COLUMN announcement_message_id INTEGER');
  }
}

export interface CreateRaffleData {
  announcement_text?: string;
  title: string;
  description: string;
  prize: string;
  prize_count: number;
  max_participants: number;
  end_date: string;
  announcement_message_id?: number;
}

export async function createRaffle(data: CreateRaffleData) {
  console.log('Creating raffle in database with data:', data);
  const db = await getDb();
  
  try {
    const result = await db.run(
      `INSERT INTO raffles (announcement_text, title, description, prize, prize_count, max_participants, end_date, announcement_message_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.announcement_text, data.title, data.description, data.prize, data.prize_count, data.max_participants, data.end_date, data.announcement_message_id]
    );
    
    console.log('Database insert result:', result);
    
    if (!result.lastID) {
      throw new Error('Failed to get lastID from insert operation');
    }
    
    // Verify the insert
    const inserted = await db.get('SELECT * FROM raffles WHERE id = ?', result.lastID);
    console.log('Verified inserted raffle:', inserted);
    
    return result.lastID;
  } catch (error) {
    console.error('Database error in createRaffle:', error);
    throw error;
  }
}

export async function getRaffle(id: number) {
  const db = await getDb();
  return db.get('SELECT * FROM raffles WHERE id = ?', id);
}

export async function getRaffles() {
  console.log('Getting all raffles');
  const db = await getDb();
  try {
    const raffles = await db.all('SELECT * FROM raffles ORDER BY created_at DESC');
    console.log('Retrieved raffles count:', raffles.length);
    return raffles;
  } catch (error) {
    console.error('Database error in getRaffles:', error);
    throw error;
  }
}

export async function deleteRaffle(id: number) {
  const db = await getDb();
  await db.run('DELETE FROM raffle_winners WHERE raffle_id = ?', id);
  await db.run('DELETE FROM raffle_participants WHERE raffle_id = ?', id);
  return db.run('DELETE FROM raffles WHERE id = ?', id);
}

export async function addParticipant(data: {
  raffle_id: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  ip_address: string;
}) {
  const db = await getDb();
  
  // Get table info
  const tableInfo = await db.all("PRAGMA table_info(raffle_participants)");
  console.log('Table schema:', tableInfo);
  
  // Build dynamic query based on existing columns
  const columns = [];
  const values = [];
  const placeholders = [];
  
  if (tableInfo.find(col => col.name === 'raffle_id')) {
    columns.push('raffle_id');
    values.push(data.raffle_id);
    placeholders.push('?');
  }
  
  if (tableInfo.find(col => col.name === 'telegram_id')) {
    columns.push('telegram_id');
    values.push(data.telegram_id);
    placeholders.push('?');
  }
  
  if (tableInfo.find(col => col.name === 'username') && data.username) {
    columns.push('username');
    values.push(data.username);
    placeholders.push('?');
  }
  
  if (tableInfo.find(col => col.name === 'first_name') && data.first_name) {
    columns.push('first_name');
    values.push(data.first_name);
    placeholders.push('?');
  }
  
  if (tableInfo.find(col => col.name === 'last_name') && data.last_name) {
    columns.push('last_name');
    values.push(data.last_name);
    placeholders.push('?');
  }
  
  if (tableInfo.find(col => col.name === 'ip_address')) {
    columns.push('ip_address');
    values.push(data.ip_address);
    placeholders.push('?');
  }
  
  const query = `
    INSERT INTO raffle_participants 
    (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
  `;
  
  console.log('Insert query:', query);
  console.log('Values:', values);
  
  return db.run(query, values);
}

export async function getParticipantCount(raffleId: number) {
  const db = await getDb();
  const result = await db.get(
    'SELECT COUNT(*) as count FROM raffle_participants WHERE raffle_id = ?',
    raffleId
  );
  return result?.count || 0;
}

export async function isParticipating(raffleId: number, telegramId: number) {
  const db = await getDb();
  const participant = await db.get(
    'SELECT 1 FROM raffle_participants WHERE raffle_id = ? AND telegram_id = ?',
    [raffleId, telegramId]
  );
  return !!participant;
}

export async function getRaffleParticipants(raffleId: number) {
  const db = await getDb();
  return db.all(
    'SELECT * FROM raffle_participants WHERE raffle_id = ? ORDER BY joined_at DESC',
    raffleId
  );
}

export async function initializeAdmin(username: string, password: string) {
  const db = await getDb();
  
  // Check if admin already exists
  const existingAdmin = await db.get('SELECT * FROM admins WHERE username = ?', username);
  if (existingAdmin) {
    return false;
  }

  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create the admin account
  await db.run(
    'INSERT INTO admins (username, password) VALUES (?, ?)',
    [username, hashedPassword]
  );

  return true;
}

export async function getAdmin(username: string) {
  const db = await getDb();
  return db.get('SELECT * FROM admins WHERE username = ?', username);
}

export async function createNewRaffle(data: CreateRaffleData) {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO raffles (announcement_text, title, description, prize, prize_count, max_participants, end_date, announcement_message_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.announcement_text, data.title, data.description, data.prize, data.prize_count, data.max_participants, data.end_date, data.announcement_message_id]
  );
  return result.lastID;
}

export async function updateRaffle(id: number, data: CreateRaffleData) {
  const db = await getDb();
  await db.run(
    `UPDATE raffles 
     SET announcement_text = ?, title = ?, description = ?, prize = ?, prize_count = ?, max_participants = ?, end_date = ?, announcement_message_id = ?
     WHERE id = ?`,
    [data.announcement_text, data.title, data.description, data.prize, data.prize_count, data.max_participants, data.end_date, data.announcement_message_id, id]
  );
  return id;
}

export async function resetParticipantsTable() {
  const db = await getDb();
  await db.exec(`
    DROP TABLE IF EXISTS raffle_participants;
    
    CREATE TABLE raffle_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raffle_id INTEGER NOT NULL,
      telegram_id INTEGER NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      ip_address TEXT NOT NULL,
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (raffle_id) REFERENCES raffles(id) ON DELETE CASCADE,
      UNIQUE(raffle_id, telegram_id)
    );
  `);
}

export async function getTableSchema(tableName: string) {
  const db = await getDb();
  const tableInfo = await db.all(`PRAGMA table_info(${tableName})`);
  return tableInfo;
}

export async function isIPParticipating(raffleId: number, ipAddress: string) {
  const db = await getDb();
  const result = await db.get(
    'SELECT COUNT(*) as count FROM raffle_participants WHERE raffle_id = ? AND ip_address = ?',
    [raffleId, ipAddress]
  );
  return result.count > 0;
}

export async function selectWinners(raffleId: number) {
  const db = await getDb();
  
  // Отримуємо інформацію про розіграш
  const raffle = await getRaffle(raffleId);
  if (!raffle) {
    throw new Error('Raffle not found');
  }

  // Перевіряємо чи закінчився розіграш
  const now = new Date();
  const endDate = new Date(raffle.end_date);
  if (now < endDate) {
    throw new Error('Raffle has not ended yet');
  }

  // Перевіряємо чи вже були вибрані переможці
  const existingWinners = await db.all(
    'SELECT * FROM raffle_winners WHERE raffle_id = ?',
    raffleId
  );
  if (existingWinners.length > 0) {
    throw new Error('Winners have already been selected');
  }

  // Отримуємо всіх учасників
  const participants = await db.all(
    'SELECT * FROM raffle_participants WHERE raffle_id = ?',
    raffleId
  );

  if (participants.length === 0) {
    throw new Error('No participants in the raffle');
  }

  if (participants.length < raffle.prize_count) {
    throw new Error('Not enough participants for the number of prizes');
  }

  // Перемішуємо учасників випадковим чином
  const shuffledParticipants = participants.sort(() => Math.random() - 0.5);
  
  // Вибираємо переможців
  const winners = shuffledParticipants.slice(0, raffle.prize_count);

  // Зберігаємо переможців
  for (const winner of winners) {
    await db.run(
      `INSERT INTO raffle_winners (raffle_id, participant_id, prize_amount)
       VALUES (?, ?, ?)`,
      [raffleId, winner.id, raffle.prize]
    );
  }

  return winners;
}

export async function getRaffleWinners(raffleId: number) {
  const db = await getDb();
  return db.all(`
    SELECT 
      w.*,
      p.telegram_id,
      p.username,
      p.first_name,
      p.last_name
    FROM raffle_winners w
    JOIN raffle_participants p ON w.participant_id = p.id
    WHERE w.raffle_id = ?
  `, raffleId);
}

export async function getEndedRafflesWithoutWinners() {
  const db = await getDb();
  const now = new Date().toISOString();
  
  // Отримуємо розіграші, які закінчились, але ще не мають переможців
  const raffles = await db.all(`
    SELECT r.* 
    FROM raffles r
    LEFT JOIN raffle_winners w ON r.id = w.raffle_id
    WHERE r.end_date <= ? 
    AND w.id IS NULL
  `, now);

  return raffles;
}

export async function checkAndSelectWinners() {
  try {
    console.log('Checking for ended raffles...');
    const endedRaffles = await getEndedRafflesWithoutWinners();
    
    if (endedRaffles.length === 0) {
      console.log('No ended raffles without winners found');
      return;
    }

    console.log(`Found ${endedRaffles.length} ended raffles without winners`);
    
    for (const raffle of endedRaffles) {
      try {
        console.log(`Processing raffle ${raffle.id}: ${raffle.title}`);
        
        // Вибираємо переможців
        await selectWinners(raffle.id);
        console.log(`Winners selected for raffle ${raffle.id}`);
        
        // Отримуємо інформацію про переможців
        const winners = await getRaffleWinners(raffle.id);
        
        // Повертаємо інформацію про розіграш і переможців
        if (winners && winners.length > 0) {
          console.log(`Returning winners for raffle ${raffle.id}:`, winners);
          return { raffle, winners };
        }
      } catch (error) {
        console.error(`Error processing raffle ${raffle.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in checkAndSelectWinners:', error);
    throw error;
  }
}

export async function initDb() {
  const db = await getDb();
  
  try {
    // Drop and recreate raffles table
    await db.exec('DROP TABLE IF EXISTS raffles;');

    await db.exec(`
      CREATE TABLE IF NOT EXISTS raffles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        announcement_text TEXT,
        title TEXT NOT NULL,
        description TEXT,
        prize TEXT NOT NULL,
        prize_count INTEGER NOT NULL,
        max_participants INTEGER,
        end_date TEXT NOT NULL,
        announcement_message_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS raffle_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raffle_id INTEGER NOT NULL,
        telegram_id INTEGER NOT NULL,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        ip_address TEXT NOT NULL,
        joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (raffle_id) REFERENCES raffles(id) ON DELETE CASCADE,
        UNIQUE(raffle_id, telegram_id)
      );
    `);
  } catch (error) {
    console.error('Error in initDb:', error);
    throw error;
  }
}
