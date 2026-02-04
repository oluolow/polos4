-- CashFlow Pro Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  open_id TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily entries table
CREATE TABLE IF NOT EXISTS daily_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  uber DECIMAL(10, 2) DEFAULT 0,
  bolt DECIMAL(10, 2) DEFAULT 0,
  freenow DECIMAL(10, 2) DEFAULT 0,
  horizon_cars DECIMAL(10, 2) DEFAULT 0,
  other_income DECIMAL(10, 2) DEFAULT 0,
  expenses DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Recurring expenses table
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Imported transactions table
CREATE TABLE IF NOT EXISTS imported_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Todos table
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_entries_user_date ON daily_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user ON recurring_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_imported_transactions_user_date ON imported_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id, completed);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all authenticated users to access their own data)
-- You can make these more restrictive later

CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid()::text = open_id);

CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = open_id);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid()::text = open_id);

CREATE POLICY "Users can view their own daily entries" ON daily_entries
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));

CREATE POLICY "Users can insert their own daily entries" ON daily_entries
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));

CREATE POLICY "Users can update their own daily entries" ON daily_entries
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));

CREATE POLICY "Users can delete their own daily entries" ON daily_entries
  FOR DELETE USING (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));

CREATE POLICY "Users can view their own recurring expenses" ON recurring_expenses
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));

CREATE POLICY "Users can insert their own recurring expenses" ON recurring_expenses
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));

CREATE POLICY "Users can update their own recurring expenses" ON recurring_expenses
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));

CREATE POLICY "Users can delete their own recurring expenses" ON recurring_expenses
  FOR DELETE USING (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));

CREATE POLICY "Users can view their own imported transactions" ON imported_transactions
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));

CREATE POLICY "Users can insert their own imported transactions" ON imported_transactions
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));

CREATE POLICY "Users can delete their own imported transactions" ON imported_transactions
  FOR DELETE USING (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));

CREATE POLICY "Users can view their own todos" ON todos
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));

CREATE POLICY "Users can insert their own todos" ON todos
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));

CREATE POLICY "Users can update their own todos" ON todos
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));

CREATE POLICY "Users can delete their own todos" ON todos
  FOR DELETE USING (user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text));
