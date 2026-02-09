import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client pour les opérations serveur avec la clé service role
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Types de la base de données
export type Database = {
  public: {
    Tables: {
      bootcamps: {
        Row: {
          id: string
          slug: string
          title: string
          tagline: string
          description: string
          level: 'Intermédiaire' | 'Avancé'
          duration: string
          price: number
          target_audience: string[]
          prerequisites: string[]
          objectives: string[]
          program: any
          methodology: string
          trainer: any
          faq: any
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['bootcamps']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['bootcamps']['Insert']>
      }
      sessions: {
        Row: {
          id: string
          bootcamp_id: string
          start_date: string
          end_date: string
          location: string
          city: string
          format: 'Présentiel' | 'Hybride'
          trainer_name: string
          max_capacity: number
          available_spots: number
          status: 'Ouvert' | 'Complet' | 'Annulé'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sessions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['sessions']['Insert']>
      }
      registrations: {
        Row: {
          id: string
          session_id: string
          user_email: string
          first_name: string
          last_name: string
          phone: string
          company: string | null
          job_title: string | null
          how_heard: string | null
          payment_status: 'Pending' | 'Paid' | 'Failed'
          payment_method: 'Card' | 'Transfer' | 'Quote'
          amount: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['registrations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['registrations']['Insert']>
      }
    }
  }
}
