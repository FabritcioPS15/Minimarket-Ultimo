import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          category: string;
          brand: string;
          cost_price: number;
          sale_price: number;
          profit_percentage: number;
          current_stock: number;
          min_stock: number;
          max_stock: number;
          expiration_date: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description: string;
          category: string;
          brand: string;
          cost_price: number;
          sale_price: number;
          profit_percentage: number;
          current_stock: number;
          min_stock: number;
          max_stock: number;
          expiration_date?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string;
          category?: string;
          brand?: string;
          cost_price?: number;
          sale_price?: number;
          profit_percentage?: number;
          current_stock?: number;
          min_stock?: number;
          max_stock?: number;
          expiration_date?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          username: string;
          email: string;
          role: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          role?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          role?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}