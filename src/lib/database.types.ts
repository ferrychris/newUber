export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DocumentStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type AvailabilityStatus = 'online' | 'offline';
export type OrderStatus = 'pending' | 'accepted' | 'completed' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      driver_verifications: {
        Row: {
          id: string
          driver_id: string | null
          status: string
          created_at: string | null
          submission_date: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          driver_id?: string | null
          status?: string
          created_at?: string | null
          submission_date?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          driver_id?: string | null
          status?: string
          created_at?: string | null
          submission_date?: string | null
          notes?: string | null
        }
      }
      driver_wallets: {
        Row: {
          id: string
          driver_id: string
          balance: number
          orders: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          driver_id: string
          balance?: number
          orders?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          balance?: number
          orders?: number
          created_at?: string
          updated_at?: string
        }
      }
      driver_profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          document_status: DocumentStatus
          availability: AvailabilityStatus
          license_url: string | null
          vehicle_url: string | null
          insurance_url: string | null
          notes: string
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          document_status?: DocumentStatus
          availability?: AvailabilityStatus
          license_url?: string | null
          vehicle_url?: string | null
          insurance_url?: string | null
          notes?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          document_status?: DocumentStatus
          availability?: AvailabilityStatus
          license_url?: string | null
          vehicle_url?: string | null
          insurance_url?: string | null
          notes?: string
        }
      }
      orders: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          status: OrderStatus
          pickup_location: string
          dropoff_location: string
          driver_id: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          status?: OrderStatus
          pickup_location: string
          dropoff_location: string
          driver_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          status?: OrderStatus
          pickup_location?: string
          dropoff_location?: string
          driver_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
