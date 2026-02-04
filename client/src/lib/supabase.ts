import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          open_id: string;
          name: string | null;
          email: string | null;
          avatar: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          open_id: string;
          name?: string | null;
          email?: string | null;
          avatar?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          open_id?: string;
          name?: string | null;
          email?: string | null;
          avatar?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      daily_entries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          uber: number;
          bolt: number;
          freenow: number;
          horizon_cars: number;
          other_income: number;
          expenses: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          uber?: number;
          bolt?: number;
          freenow?: number;
          horizon_cars?: number;
          other_income?: number;
          expenses?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          uber?: number;
          bolt?: number;
          freenow?: number;
          horizon_cars?: number;
          other_income?: number;
          expenses?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      recurring_expenses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          day_of_month: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount: number;
          day_of_month: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          amount?: number;
          day_of_month?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      imported_transactions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          description: string;
          amount: number;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          description: string;
          amount: number;
          category: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          description?: string;
          amount?: number;
          category?: string;
          created_at?: string;
        };
      };
      todos: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          text: string;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          text?: string;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
