export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = "rider" | "driver" | "admin"
export type VehicleType = "sedan" | "standard" | "suv"

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      driver_applications: {
        Row: {
          created_at: string
          drivers_license: string
          id: string
          insurance_policy: string
          license_plate: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          vehicle_color: string
          vehicle_make: string
          vehicle_model: string
          vehicle_type: string | null
          vehicle_year: number
        }
        Insert: {
          created_at?: string
          drivers_license: string
          id?: string
          insurance_policy: string
          license_plate: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vehicle_color: string
          vehicle_make: string
          vehicle_model: string
          vehicle_type?: string | null
          vehicle_year: number
        }
        Update: {
          created_at?: string
          drivers_license?: string
          id?: string
          insurance_policy?: string
          license_plate?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_color?: string
          vehicle_make?: string
          vehicle_model?: string
          vehicle_type?: string | null
          vehicle_year?: number
        }
        Relationships: []
      }
      driver_earnings: {
        Row: {
          created_at: string | null
          driver_profile_id: string
          gross_amount: number
          id: string
          net_amount: number
          payout_date: string | null
          payout_id: string | null
          payout_status: string | null
          platform_fee: number
          ride_id: string | null
        }
        Insert: {
          created_at?: string | null
          driver_profile_id: string
          gross_amount: number
          id?: string
          net_amount: number
          payout_date?: string | null
          payout_id?: string | null
          payout_status?: string | null
          platform_fee: number
          ride_id?: string | null
        }
        Update: {
          created_at?: string | null
          driver_profile_id?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          payout_date?: string | null
          payout_id?: string | null
          payout_status?: string | null
          platform_fee?: number
          ride_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_earnings_driver_profile_id_fkey"
            columns: ["driver_profile_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_earnings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_profiles: {
        Row: {
          average_rating: number | null
          connect_onboarding_completed: boolean | null
          created_at: string | null
          driver_name: string | null
          id: string
          is_active: boolean | null
          is_available: boolean | null
          last_location_lat: number | null
          last_location_lng: number | null
          last_location_updated_at: string | null
          license_number: string
          rating_avg: number | null
          stripe_connect_account_id: string | null
          total_earnings: number | null
          total_rides: number | null
          total_trips: number | null
          updated_at: string | null
          user_id: string
          vehicle_color: string
          vehicle_make: string
          vehicle_model: string
          vehicle_plate: string
          vehicle_type: string | null
          vehicle_year: number | null
          verification_notes: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          average_rating?: number | null
          connect_onboarding_completed?: boolean | null
          created_at?: string | null
          driver_name?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          last_location_lat?: number | null
          last_location_lng?: number | null
          last_location_updated_at?: string | null
          license_number?: string
          rating_avg?: number | null
          stripe_connect_account_id?: string | null
          total_earnings?: number | null
          total_rides?: number | null
          total_trips?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_color?: string
          vehicle_make?: string
          vehicle_model?: string
          vehicle_plate?: string
          vehicle_type?: string | null
          vehicle_year?: number | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          average_rating?: number | null
          connect_onboarding_completed?: boolean | null
          created_at?: string | null
          driver_name?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          last_location_lat?: number | null
          last_location_lng?: number | null
          last_location_updated_at?: string | null
          license_number?: string
          rating_avg?: number | null
          stripe_connect_account_id?: string | null
          total_earnings?: number | null
          total_rides?: number | null
          total_trips?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_color?: string
          vehicle_make?: string
          vehicle_model?: string
          vehicle_plate?: string
          vehicle_type?: string | null
          vehicle_year?: number | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings: {
        Row: {
          amount: number
          created_at: string | null
          driver_id: string
          id: string
          paid_at: string | null
          payout_id: string | null
          platform_fee: number
          ride_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          driver_id: string
          id?: string
          paid_at?: string | null
          payout_id?: string | null
          platform_fee?: number
          ride_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          driver_id?: string
          id?: string
          paid_at?: string | null
          payout_id?: string | null
          platform_fee?: number
          ride_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "earnings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          id: string
          message_text: string
          read: boolean | null
          read_at: string | null
          recipient_id: string | null
          recipient_type: string | null
          ride_id: string | null
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_text: string
          read?: boolean | null
          read_at?: string | null
          recipient_id?: string | null
          recipient_type?: string | null
          ride_id?: string | null
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_text?: string
          read?: boolean | null
          read_at?: string | null
          recipient_id?: string | null
          recipient_type?: string | null
          ride_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          ride_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          ride_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          ride_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          stripe_payment_method_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          stripe_payment_method_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          stripe_payment_method_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          average_rating: number | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          total_rides: number | null
          updated_at: string | null
        }
        Insert: {
          average_rating?: number | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role: string
          total_rides?: number | null
          updated_at?: string | null
        }
        Update: {
          average_rating?: number | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          total_rides?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string | null
          driver_comment: string | null
          driver_id: string
          driver_rating: number | null
          id: string
          ride_id: string
          rider_comment: string | null
          rider_id: string
          rider_rating: number | null
        }
        Insert: {
          created_at?: string | null
          driver_comment?: string | null
          driver_id: string
          driver_rating?: number | null
          id?: string
          ride_id: string
          rider_comment?: string | null
          rider_id: string
          rider_rating?: number | null
        }
        Update: {
          created_at?: string | null
          driver_comment?: string | null
          driver_id?: string
          driver_rating?: number | null
          id?: string
          ride_id?: string
          rider_comment?: string | null
          rider_id?: string
          rider_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          accepted_at: string | null
          canceled_at: string | null
          canceled_by: string | null
          completed_at: string | null
          distance_miles: number | null
          driver_current_lat: number | null
          driver_current_lng: number | null
          driver_earnings: number | null
          driver_id: string | null
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          duration_minutes: number | null
          fare_estimate: number
          fare_final: number | null
          id: string
          last_location_update: string | null
          payment_intent_id: string | null
          payment_method_id: string | null
          payment_status: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          platform_fee: number | null
          requested_at: string | null
          rider_id: string
          scheduled_at: string | null
          started_at: string | null
          status: string
          vehicle_type: string | null
        }
        Insert: {
          accepted_at?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          completed_at?: string | null
          distance_miles?: number | null
          driver_current_lat?: number | null
          driver_current_lng?: number | null
          driver_earnings?: number | null
          driver_id?: string | null
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          duration_minutes?: number | null
          fare_estimate?: number
          fare_final?: number | null
          id?: string
          last_location_update?: string | null
          payment_intent_id?: string | null
          payment_method_id?: string | null
          payment_status?: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          platform_fee?: number | null
          requested_at?: string | null
          rider_id: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          vehicle_type?: string | null
        }
        Update: {
          accepted_at?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          completed_at?: string | null
          distance_miles?: number | null
          driver_current_lat?: number | null
          driver_current_lng?: number | null
          driver_earnings?: number | null
          driver_id?: string | null
          dropoff_address?: string
          dropoff_lat?: number
          dropoff_lng?: number
          duration_minutes?: number | null
          fare_estimate?: number
          fare_final?: number | null
          id?: string
          last_location_update?: string | null
          payment_intent_id?: string | null
          payment_method_id?: string | null
          payment_status?: string | null
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          platform_fee?: number | null
          requested_at?: string | null
          rider_id?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          failure_reason: string | null
          id: string
          metadata: Json | null
          ride_id: string | null
          status: string | null
          stripe_transaction_id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          ride_id?: string | null
          status?: string | null
          stripe_transaction_id: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          ride_id?: string | null
          status?: string | null
          stripe_transaction_id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_locations: {
        Row: {
          id: string
          lat: number
          lng: number
          recorded_at: string | null
          ride_id: string
        }
        Insert: {
          id?: string
          lat: number
          lng: number
          recorded_at?: string | null
          ride_id: string
        }
        Update: {
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string | null
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_locations_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_driver_profile: {
        Args: { check_driver_id: string }
        Returns: boolean
      }
      get_user_role: { Args: never; Returns: string }
      is_driver_for_ride: { Args: { ride_driver_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
