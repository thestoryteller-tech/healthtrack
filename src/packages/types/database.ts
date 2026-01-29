// Database types for Supabase
// These types are manually created to match the schema in supabase/migrations/00001_initial_schema.sql

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type UserRole = 'admin' | 'member';
export type Platform = 'ga4' | 'meta' | 'tiktok' | 'google_ads' | 'linkedin';
export type SensitivePageAction = 'block' | 'strip';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          subscription_tier: SubscriptionTier;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          subscription_tier?: SubscriptionTier;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          subscription_tier?: SubscriptionTier;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          org_id: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          org_id: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          org_id?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          }
        ];
      };
      api_keys: {
        Row: {
          id: string;
          org_id: string;
          key_hash: string;
          key_prefix: string;
          name: string;
          last_used_at: string | null;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          key_hash: string;
          key_prefix: string;
          name: string;
          last_used_at?: string | null;
          created_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          key_hash?: string;
          key_prefix?: string;
          name?: string;
          last_used_at?: string | null;
          created_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'api_keys_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          }
        ];
      };
      tracking_configs: {
        Row: {
          id: string;
          org_id: string;
          platform: Platform;
          credentials_encrypted: string;
          enabled: boolean;
          last_sync_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          platform: Platform;
          credentials_encrypted: string;
          enabled?: boolean;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          platform?: Platform;
          credentials_encrypted?: string;
          enabled?: boolean;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tracking_configs_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          }
        ];
      };
      sensitive_pages: {
        Row: {
          id: string;
          org_id: string;
          url_pattern: string;
          action: SensitivePageAction;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          url_pattern: string;
          action?: SensitivePageAction;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          url_pattern?: string;
          action?: SensitivePageAction;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sensitive_pages_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          }
        ];
      };
      events_log: {
        Row: {
          id: string;
          org_id: string;
          event_type: string;
          event_name: string | null;
          platforms_sent: string[] | null;
          scrubbed_fields: string[] | null;
          consent_state: Json | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          event_type: string;
          event_name?: string | null;
          platforms_sent?: string[] | null;
          scrubbed_fields?: string[] | null;
          consent_state?: Json | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          event_type?: string;
          event_name?: string | null;
          platforms_sent?: string[] | null;
          scrubbed_fields?: string[] | null;
          consent_state?: Json | null;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_log_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          }
        ];
      };
      audit_log: {
        Row: {
          id: string;
          org_id: string;
          user_id: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          details: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id?: string | null;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string | null;
          action?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      usage_metrics: {
        Row: {
          id: string;
          org_id: string;
          period_start: string;
          period_end: string;
          event_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          period_start: string;
          period_end: string;
          event_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          period_start?: string;
          period_end?: string;
          event_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'usage_metrics_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      subscription_tier: SubscriptionTier;
      user_role: UserRole;
      platform: Platform;
      sensitive_page_action: SensitivePageAction;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Helper types for easier usage
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert'];
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update'];

export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type ApiKey = Database['public']['Tables']['api_keys']['Row'];
export type ApiKeyInsert = Database['public']['Tables']['api_keys']['Insert'];
export type ApiKeyUpdate = Database['public']['Tables']['api_keys']['Update'];

export type TrackingConfig = Database['public']['Tables']['tracking_configs']['Row'];
export type TrackingConfigInsert = Database['public']['Tables']['tracking_configs']['Insert'];
export type TrackingConfigUpdate = Database['public']['Tables']['tracking_configs']['Update'];

export type SensitivePage = Database['public']['Tables']['sensitive_pages']['Row'];
export type SensitivePageInsert = Database['public']['Tables']['sensitive_pages']['Insert'];
export type SensitivePageUpdate = Database['public']['Tables']['sensitive_pages']['Update'];

export type EventLog = Database['public']['Tables']['events_log']['Row'];
export type EventLogInsert = Database['public']['Tables']['events_log']['Insert'];
export type EventLogUpdate = Database['public']['Tables']['events_log']['Update'];

export type AuditLog = Database['public']['Tables']['audit_log']['Row'];
export type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert'];
export type AuditLogUpdate = Database['public']['Tables']['audit_log']['Update'];

export type UsageMetrics = Database['public']['Tables']['usage_metrics']['Row'];
export type UsageMetricsInsert = Database['public']['Tables']['usage_metrics']['Insert'];
export type UsageMetricsUpdate = Database['public']['Tables']['usage_metrics']['Update'];
