import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../drizzle/sqlite-schema";
import path from "path";

// Use persistent volume path in production, local path in development
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'cashflow.db');
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

// Initialize tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openId TEXT NOT NULL UNIQUE,
    name TEXT,
    email TEXT,
    loginMethod TEXT,
    role TEXT DEFAULT 'user' NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    lastSignedIn INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daily_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    date TEXT NOT NULL,
    uber TEXT DEFAULT '0.00' NOT NULL,
    bolt TEXT DEFAULT '0.00' NOT NULL,
    freenow TEXT DEFAULT '0.00' NOT NULL,
    horizoncars TEXT DEFAULT '0.00' NOT NULL,
    other TEXT DEFAULT '0.00' NOT NULL,
    expenses TEXT DEFAULT '0.00' NOT NULL,
    balance TEXT DEFAULT '0.00' NOT NULL,
    notes TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    UNIQUE(userId, date)
  );

  CREATE TABLE IF NOT EXISTS recurring_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    name TEXT NOT NULL,
    amount TEXT NOT NULL,
    dayOfMonth INTEGER NOT NULL,
    category TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS imported_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    amount TEXT NOT NULL,
    category TEXT,
    source TEXT,
    verified INTEGER DEFAULT 0 NOT NULL,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS todo_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0 NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS calendar_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    amount TEXT,
    type TEXT NOT NULL,
    description TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );
`);

console.log("[SQLite] Database initialized");

export async function upsertUser(user: schema.InsertUser): Promise<void> {
  const now = Date.now();
  const stmt = sqlite.prepare(`
    INSERT INTO users (openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)
    VALUES (?, ?, ?, ?, 'user', ?, ?, ?)
    ON CONFLICT(openId) DO UPDATE SET
      name = COALESCE(excluded.name, name),
      email = COALESCE(excluded.email, email),
      loginMethod = COALESCE(excluded.loginMethod, loginMethod),
      lastSignedIn = excluded.lastSignedIn,
      updatedAt = excluded.updatedAt
  `);
  stmt.run(
    user.openId,
    user.name || null,
    user.email || null,
    user.loginMethod || null,
    user.createdAt ? new Date(user.createdAt).getTime() : now,
    now,
    user.lastSignedIn ? new Date(user.lastSignedIn).getTime() : now
  );
}

export async function getUserByOpenId(openId: string): Promise<schema.User | undefined> {
  const stmt = sqlite.prepare("SELECT * FROM users WHERE openId = ?");
  const row: any = stmt.get(openId);
  if (!row) return undefined;
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    lastSignedIn: new Date(row.lastSignedIn),
  };
}

export async function getDailyEntriesByMonth(userId: number, year: number, month: number): Promise<schema.DailyEntry[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  const stmt = sqlite.prepare("SELECT * FROM daily_entries WHERE userId = ? AND date >= ? AND date <= ? ORDER BY date");
  const rows: any[] = stmt.all(userId, startDate, endDate);
  return rows.map(row => ({
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }));
}

export async function upsertDailyEntry(entry: schema.InsertDailyEntry): Promise<void> {
  const now = Date.now();
  const stmt = sqlite.prepare(`
    INSERT INTO daily_entries (userId, date, uber, bolt, freenow, horizoncars, other, expenses, balance, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId, date) DO UPDATE SET
      uber = excluded.uber,
      bolt = excluded.bolt,
      freenow = excluded.freenow,
      horizoncars = excluded.horizoncars,
      other = excluded.other,
      expenses = excluded.expenses,
      balance = excluded.balance,
      notes = COALESCE(excluded.notes, notes),
      updatedAt = excluded.updatedAt
  `);
  stmt.run(
    entry.userId,
    typeof entry.date === 'string' ? entry.date : entry.date.toISOString().split('T')[0],
    entry.uber,
    entry.bolt,
    entry.freenow,
    entry.horizoncars,
    entry.other,
    entry.expenses,
    entry.balance,
    entry.notes || null,
    entry.createdAt ? new Date(entry.createdAt).getTime() : now,
    now
  );
}

export async function getRecurringExpenses(userId: number): Promise<schema.RecurringExpense[]> {
  const stmt = sqlite.prepare("SELECT * FROM recurring_expenses WHERE userId = ? ORDER BY dayOfMonth");
  const rows: any[] = stmt.all(userId);
  return rows.map(row => ({
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }));
}

export async function createRecurringExpense(expense: schema.InsertRecurringExpense): Promise<schema.RecurringExpense> {
  const now = Date.now();
  const stmt = sqlite.prepare(`
    INSERT INTO recurring_expenses (userId, name, amount, dayOfMonth, category, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    expense.userId,
    expense.name,
    expense.amount,
    expense.dayOfMonth,
    expense.category || null,
    expense.createdAt ? new Date(expense.createdAt).getTime() : now,
    now
  );
  return {
    ...expense,
    id: Number(result.lastInsertRowid),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

export async function deleteRecurringExpense(userId: number, expenseId: number): Promise<void> {
  const stmt = sqlite.prepare("DELETE FROM recurring_expenses WHERE id = ? AND userId = ?");
  stmt.run(expenseId, userId);
}

export async function getImportedTransactions(userId: number): Promise<schema.ImportedTransaction[]> {
  const stmt = sqlite.prepare("SELECT * FROM imported_transactions WHERE userId = ? ORDER BY date DESC");
  const rows: any[] = stmt.all(userId);
  return rows.map(row => ({
    ...row,
    verified: Boolean(row.verified),
    createdAt: new Date(row.createdAt),
  }));
}

export async function createImportedTransactions(transactions: schema.InsertImportedTransaction[]): Promise<void> {
  const now = Date.now();
  const stmt = sqlite.prepare(`
    INSERT INTO imported_transactions (userId, date, description, amount, category, source, verified, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = sqlite.transaction((txns: schema.InsertImportedTransaction[]) => {
    for (const txn of txns) {
      stmt.run(
        txn.userId,
        typeof txn.date === 'string' ? txn.date : txn.date.toISOString().split('T')[0],
        txn.description || null,
        txn.amount,
        txn.category || null,
        txn.source || null,
        txn.verified ? 1 : 0,
        txn.createdAt ? new Date(txn.createdAt).getTime() : now
      );
    }
  });
  insertMany(transactions);
}

export async function deleteImportedTransaction(userId: number, transactionId: number): Promise<void> {
  const stmt = sqlite.prepare("DELETE FROM imported_transactions WHERE userId = ? AND id = ?");
  stmt.run(userId, transactionId);
}

export async function deleteImportedTransactions(userId: number): Promise<void> {
  const stmt = sqlite.prepare("DELETE FROM imported_transactions WHERE userId = ?");
  stmt.run(userId);
}

export async function getTodoItems(userId: number): Promise<schema.TodoItem[]> {
  const stmt = sqlite.prepare("SELECT * FROM todo_items WHERE userId = ? ORDER BY createdAt");
  const rows: any[] = stmt.all(userId);
  return rows.map(row => ({
    ...row,
    completed: Boolean(row.completed),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }));
}

export async function createTodoItem(item: schema.InsertTodoItem): Promise<schema.TodoItem> {
  const now = Date.now();
  const stmt = sqlite.prepare(`
    INSERT INTO todo_items (userId, text, completed, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    item.userId,
    item.text,
    item.completed ? 1 : 0,
    item.createdAt ? new Date(item.createdAt).getTime() : now,
    now
  );
  return {
    ...item,
    id: Number(result.lastInsertRowid),
    completed: Boolean(item.completed),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

export async function updateTodoItem(userId: number, itemId: number, updates: Partial<schema.InsertTodoItem>): Promise<void> {
  const now = Date.now();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.text !== undefined) {
    fields.push("text = ?");
    values.push(updates.text);
  }
  if (updates.completed !== undefined) {
    fields.push("completed = ?");
    values.push(updates.completed ? 1 : 0);
  }
  fields.push("updatedAt = ?");
  values.push(now);
  
  values.push(itemId, userId);
  
  const stmt = sqlite.prepare(`UPDATE todo_items SET ${fields.join(", ")} WHERE id = ? AND userId = ?`);
  stmt.run(...values);
}

export async function deleteTodoItem(userId: number, itemId: number): Promise<void> {
  const stmt = sqlite.prepare("DELETE FROM todo_items WHERE id = ? AND userId = ?");
  stmt.run(itemId, userId);
}

export async function getCalendarItems(userId: number): Promise<schema.CalendarItem[]> {
  const stmt = sqlite.prepare("SELECT * FROM calendar_items WHERE userId = ? ORDER BY date");
  const rows: any[] = stmt.all(userId);
  return rows.map(row => ({
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }));
}

export async function createCalendarItem(item: schema.InsertCalendarItem): Promise<schema.CalendarItem> {
  const now = Date.now();
  const stmt = sqlite.prepare(`
    INSERT INTO calendar_items (userId, title, date, amount, type, description, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    item.userId,
    item.title,
    typeof item.date === 'string' ? item.date : item.date.toISOString().split('T')[0],
    item.amount || null,
    item.type,
    item.description || null,
    item.createdAt ? new Date(item.createdAt).getTime() : now,
    now
  );
  return {
    ...item,
    id: Number(result.lastInsertRowid),
    date: typeof item.date === 'string' ? item.date : item.date.toISOString().split('T')[0],
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

export async function deleteCalendarItem(userId: number, itemId: number): Promise<void> {
  const stmt = sqlite.prepare("DELETE FROM calendar_items WHERE id = ? AND userId = ?");
  stmt.run(itemId, userId);
}
