import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nqvlgvgxzfkskwwrshpj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmxndmd4emZrc2t3d3JzaHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTI0NDMsImV4cCI6MjA4Nzg2ODQ0M30.v2bhTlsSBsakP17SQ19Ap-LD_pxhA7wNqd4VVN3aJ0c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Tipos para o Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          is_admin: boolean;
        };
        Insert: {
          id: string;
          email: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          is_admin?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          is_admin?: boolean;
        };
      };
      banks: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          initial_balance: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          initial_balance?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          initial_balance?: number;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          created_at?: string;
        };
      };
      credit_cards: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          bank: string | null;
          credit_limit: number;
          icon: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          bank?: string | null;
          credit_limit?: number;
          icon?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          bank?: string | null;
          credit_limit?: number;
          icon?: string;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          description: string;
          bank: string;
          type: 'debit' | 'credit';
          category: string;
          value: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          description: string;
          bank: string;
          type: 'debit' | 'credit';
          category: string;
          value: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          description?: string;
          bank?: string;
          type?: 'debit' | 'credit';
          category?: string;
          value?: number;
          created_at?: string;
        };
      };
      credit_card_transactions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          description: string;
          card: string;
          category: string;
          value: number;
          is_payment: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          description: string;
          card: string;
          category: string;
          value: number;
          is_payment?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          description?: string;
          card?: string;
          category?: string;
          value?: number;
          is_payment?: boolean;
          created_at?: string;
        };
      };
      pending_users: {
        Row: {
          id: string;
          email: string;
          created_by: string | null;
          expires_at: string | null;
          default_banks: Json | null;
          default_categories: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_by?: string | null;
          expires_at?: string | null;
          default_banks?: Json | null;
          default_categories?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_by?: string | null;
          expires_at?: string | null;
          default_banks?: Json | null;
          default_categories?: Json | null;
          created_at?: string;
        };
      };
    };
  };
}
