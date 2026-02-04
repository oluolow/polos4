import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Daily income and expense entries
 * Stores daily financial data for each user
 */
export const dailyEntries = mysqlTable("daily_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: date("date").notNull(), // YYYY-MM-DD format
  uber: decimal("uber", { precision: 10, scale: 2 }).default("0.00").notNull(),
  bolt: decimal("bolt", { precision: 10, scale: 2 }).default("0.00").notNull(),
  freenow: decimal("freenow", { precision: 10, scale: 2 }).default("0.00").notNull(),
  horizoncars: decimal("horizoncars", { precision: 10, scale: 2 }).default("0.00").notNull(),
  other: decimal("other", { precision: 10, scale: 2 }).default("0.00").notNull(),
  expenses: decimal("expenses", { precision: 10, scale: 2 }).default("0.00").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyEntry = typeof dailyEntries.$inferSelect;
export type InsertDailyEntry = typeof dailyEntries.$inferInsert;

/**
 * Recurring expenses (rent, subscriptions, etc.)
 */
export const recurringExpenses = mysqlTable("recurring_expenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dayOfMonth: int("dayOfMonth").notNull(), // 1-31
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RecurringExpense = typeof recurringExpenses.$inferSelect;
export type InsertRecurringExpense = typeof recurringExpenses.$inferInsert;

/**
 * Imported bank transactions from CSV files
 */
export const importedTransactions = mysqlTable("imported_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: date("date").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }),
  source: varchar("source", { length: 100 }), // uber, bolt, freenow, etc.
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImportedTransaction = typeof importedTransactions.$inferSelect;
export type InsertImportedTransaction = typeof importedTransactions.$inferInsert;

/**
 * Todo items for task management
 */
export const todoItems = mysqlTable("todo_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  text: text("text").notNull(),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TodoItem = typeof todoItems.$inferSelect;
export type InsertTodoItem = typeof todoItems.$inferInsert;

/**
 * Calendar items for events and reminders
 */
export const calendarItems = mysqlTable("calendar_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  date: date("date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  type: mysqlEnum("type", ["income", "expense", "reminder"]).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CalendarItem = typeof calendarItems.$inferSelect;
export type InsertCalendarItem = typeof calendarItems.$inferInsert;
