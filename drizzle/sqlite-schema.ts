import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role").default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).notNull(),
});

export const dailyEntries = sqliteTable("daily_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  uber: text("uber").default("0.00").notNull(),
  bolt: text("bolt").default("0.00").notNull(),
  freenow: text("freenow").default("0.00").notNull(),
  horizoncars: text("horizoncars").default("0.00").notNull(),
  other: text("other").default("0.00").notNull(),
  expenses: text("expenses").default("0.00").notNull(),
  balance: text("balance").default("0.00").notNull(),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const recurringExpenses = sqliteTable("recurring_expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  name: text("name").notNull(),
  amount: text("amount").notNull(),
  dayOfMonth: integer("dayOfMonth").notNull(), // 1-31
  category: text("category"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const importedTransactions = sqliteTable("imported_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  date: text("date").notNull(),
  description: text("description"),
  amount: text("amount").notNull(),
  category: text("category"),
  source: text("source"),
  verified: integer("verified", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

export const todoItems = sqliteTable("todo_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  text: text("text").notNull(),
  completed: integer("completed", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const calendarItems = sqliteTable("calendar_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  amount: text("amount"),
  type: text("type").notNull(), // income, expense, reminder
  description: text("description"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DailyEntry = typeof dailyEntries.$inferSelect;
export type InsertDailyEntry = typeof dailyEntries.$inferInsert;
export type RecurringExpense = typeof recurringExpenses.$inferSelect;
export type InsertRecurringExpense = typeof recurringExpenses.$inferInsert;
export type ImportedTransaction = typeof importedTransactions.$inferSelect;
export type InsertImportedTransaction = typeof importedTransactions.$inferInsert;
export type TodoItem = typeof todoItems.$inferSelect;
export type InsertTodoItem = typeof todoItems.$inferInsert;
export type CalendarItem = typeof calendarItems.$inferSelect;
export type InsertCalendarItem = typeof calendarItems.$inferInsert;
