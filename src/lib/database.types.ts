export type Database = {
  public: {
    Tables: {
      training_slots: {
        Row: {
          id: string
          session_name: string
          training_date: string
          starts_at: string
          duration_minutes: number
          capacity: number
          location: string
          created_at: string
        }
        Insert: {
          id?: string
          session_name: string
          training_date: string
          starts_at: string
          duration_minutes?: number
          capacity?: number
          location?: string
          created_at?: string
        }
        Update: {
          session_name?: string
          training_date?: string
          starts_at?: string
          duration_minutes?: number
          capacity?: number
          location?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          slot_id: string
          member_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          slot_id: string
          member_id: string
          status?: string
          created_at?: string
        }
        Update: {
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_slot_id_fkey'
            columns: ['slot_id']
            isOneToOne: false
            referencedRelation: 'training_slots'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_available_training_slots: {
        Args: Record<string, never>
        Returns: {
          slot_id: string
          session_name: string
          training_date: string
          starts_at: string
          duration_minutes: number
          capacity: number
          location: string
          spots_left: number
        }[]
      }
      book_training_slot: {
        Args: { p_slot_id: string }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
