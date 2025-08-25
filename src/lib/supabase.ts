import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          email: string
          name: string
          points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          points?: number
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          customer_id: string
          amount: number
          points_earned: number
          type: 'purchase' | 'redemption'
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          amount: number
          points_earned: number
          type: 'purchase' | 'redemption'
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          amount?: number
          points_earned?: number
          type?: 'purchase' | 'redemption'
          description?: string
        }
      }
      rewards: {
        Row: {
          id: string
          name: string
          points_required: number
          description: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          points_required: number
          description: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          points_required?: number
          description?: string
          active?: boolean
        }
      }
    }
  }
}