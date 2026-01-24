export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type RideStatus =
  | 'requested'
  | 'matching'
  | 'accepted'
  | 'arriving'
  | 'in_progress'
  | 'completed'
  | 'canceled';

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';
export type TransactionType = 'charge' | 'refund' | 'payout' | 'platform_fee';
export type TransactionStatus = 'pending' | 'succeeded' | 'failed' | 'canceled';
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';
export type UserRole = 'rider' | 'driver' | 'admin';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type VehicleType = 'sedan' | 'standard' | 'suv';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: UserRole;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      driver_profiles: {
        Row: {
          id: string;
          user_id: string;
          vehicle_make: string;
          vehicle_model: string;
          vehicle_year: number | null;
          vehicle_color: string;
          vehicle_plate: string;
          license_number: string;
          is_available: boolean;
          is_active: boolean;
          last_location_lat: number | null;
          last_location_lng: number | null;
          last_location_updated_at: string | null;
          rating_avg: number;
          total_trips: number;
          stripe_connect_account_id: string | null;
          connect_onboarding_completed: boolean;
          total_earnings: number;
          vehicle_type: VehicleType | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vehicle_make?: string;
          vehicle_model?: string;
          vehicle_year?: number | null;
          vehicle_color?: string;
          vehicle_plate?: string;
          license_number?: string;
          is_available?: boolean;
          is_active?: boolean;
          last_location_lat?: number | null;
          last_location_lng?: number | null;
          last_location_updated_at?: string | null;
          rating_avg?: number;
          total_trips?: number;
          stripe_connect_account_id?: string | null;
          connect_onboarding_completed?: boolean;
          total_earnings?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vehicle_make?: string;
          vehicle_model?: string;
          vehicle_year?: number | null;
          vehicle_color?: string;
          vehicle_plate?: string;
          license_number?: string;
          is_available?: boolean;
          is_active?: boolean;
          last_location_lat?: number | null;
          last_location_lng?: number | null;
          last_location_updated_at?: string | null;
          rating_avg?: number;
          total_trips?: number;
          stripe_connect_account_id?: string | null;
          connect_onboarding_completed?: boolean;
          total_earnings?: number;
          vehicle_type?: VehicleType | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      rides: {
        Row: {
          id: string;
          rider_id: string;
          driver_id: string | null;
          status: RideStatus;
          pickup_address: string;
          pickup_lat: number;
          pickup_lng: number;
          dropoff_address: string;
          dropoff_lat: number;
          dropoff_lng: number;
          fare_estimate: number;
          fare_final: number | null;
          distance_miles: number;
          duration_minutes: number;
          requested_at: string;
          accepted_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          canceled_at: string | null;
          canceled_by: 'rider' | 'driver' | 'admin' | null;
          payment_status: PaymentStatus;
          payment_intent_id: string | null;
          payment_method_id: string | null;
          platform_fee: number;
          driver_earnings: number;
          scheduled_at: string | null;
          vehicle_type: VehicleType | null;
        };
        Insert: {
          id?: string;
          rider_id: string;
          driver_id?: string | null;
          status?: RideStatus;
          pickup_address: string;
          pickup_lat: number;
          pickup_lng: number;
          dropoff_address: string;
          dropoff_lat: number;
          dropoff_lng: number;
          fare_estimate?: number;
          fare_final?: number | null;
          distance_miles?: number;
          duration_minutes?: number;
          requested_at?: string;
          accepted_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          canceled_at?: string | null;
          canceled_by?: 'rider' | 'driver' | 'admin' | null;
          payment_status?: PaymentStatus;
          payment_intent_id?: string | null;
          payment_method_id?: string | null;
          platform_fee?: number;
          driver_earnings?: number;
          scheduled_at?: string | null;
          vehicle_type?: VehicleType | null;
        };
        Update: {
          id?: string;
          rider_id?: string;
          driver_id?: string | null;
          status?: RideStatus;
          pickup_address?: string;
          pickup_lat?: number;
          pickup_lng?: number;
          dropoff_address?: string;
          dropoff_lat?: number;
          dropoff_lng?: number;
          fare_estimate?: number;
          fare_final?: number | null;
          distance_miles?: number;
          duration_minutes?: number;
          requested_at?: string;
          accepted_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          canceled_at?: string | null;
          canceled_by?: 'rider' | 'driver' | 'admin' | null;
          payment_status?: PaymentStatus;
          payment_intent_id?: string | null;
          payment_method_id?: string | null;
          platform_fee?: number;
          driver_earnings?: number;
          scheduled_at?: string | null;
          vehicle_type?: VehicleType | null;
        };
      };
      trip_locations: {
        Row: {
          id: string;
          ride_id: string;
          lat: number;
          lng: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          lat: number;
          lng: number;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          lat?: number;
          lng?: number;
          recorded_at?: string;
        };
      };
      payment_methods: {
        Row: {
          id: string;
          user_id: string;
          stripe_payment_method_id: string;
          card_brand: string | null;
          card_last4: string | null;
          card_exp_month: number | null;
          card_exp_year: number | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_payment_method_id: string;
          card_brand?: string | null;
          card_last4?: string | null;
          card_exp_month?: number | null;
          card_exp_year?: number | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_payment_method_id?: string;
          card_brand?: string | null;
          card_last4?: string | null;
          card_exp_month?: number | null;
          card_exp_year?: number | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          ride_id: string | null;
          user_id: string;
          transaction_type: TransactionType;
          amount: number;
          currency: string;
          stripe_transaction_id: string;
          status: TransactionStatus;
          failure_reason: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ride_id?: string | null;
          user_id: string;
          transaction_type: TransactionType;
          amount: number;
          currency?: string;
          stripe_transaction_id: string;
          status?: TransactionStatus;
          failure_reason?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string | null;
          user_id?: string;
          transaction_type?: TransactionType;
          amount?: number;
          currency?: string;
          stripe_transaction_id?: string;
          status?: TransactionStatus;
          failure_reason?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      driver_earnings: {
        Row: {
          id: string;
          driver_profile_id: string;
          ride_id: string | null;
          gross_amount: number;
          platform_fee: number;
          net_amount: number;
          payout_status: PayoutStatus;
          payout_id: string | null;
          payout_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_profile_id: string;
          ride_id?: string | null;
          gross_amount: number;
          platform_fee: number;
          net_amount: number;
          payout_status?: PayoutStatus;
          payout_id?: string | null;
          payout_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_profile_id?: string;
          ride_id?: string | null;
          gross_amount?: number;
          platform_fee?: number;
          net_amount?: number;
          payout_status?: PayoutStatus;
          payout_id?: string | null;
          payout_date?: string | null;
          created_at?: string;
        };
      };
      driver_applications: {
        Row: {
          id: string;
          user_id: string;
          status: ApplicationStatus;
          vehicle_make: string;
          vehicle_model: string;
          vehicle_year: number;
          vehicle_color: string;
          license_plate: string;
          drivers_license: string;
          insurance_policy: string;
          vehicle_type: VehicleType | null;
          rejection_reason: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: ApplicationStatus;
          vehicle_make: string;
          vehicle_model: string;
          vehicle_year: number;
          vehicle_color: string;
          license_plate: string;
          drivers_license: string;
          insurance_policy: string;
          vehicle_type?: VehicleType | null;
          rejection_reason?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: ApplicationStatus;
          vehicle_make?: string;
          vehicle_model?: string;
          vehicle_year?: number;
          vehicle_color?: string;
          license_plate?: string;
          drivers_license?: string;
          insurance_policy?: string;
          vehicle_type?: VehicleType | null;
          rejection_reason?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data: Json | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data?: Json | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          data?: Json | null;
          read?: boolean;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          ride_id: string | null;
          sender_id: string;
          recipient_id: string | null;
          recipient_type: 'rider' | 'driver' | 'admin' | 'all' | null;
          message_text: string;
          read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ride_id?: string | null;
          sender_id: string;
          recipient_id?: string | null;
          recipient_type?: 'rider' | 'driver' | 'admin' | 'all' | null;
          message_text: string;
          read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string | null;
          sender_id?: string;
          recipient_id?: string | null;
          recipient_type?: 'rider' | 'driver' | 'admin' | 'all' | null;
          message_text?: string;
          read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
