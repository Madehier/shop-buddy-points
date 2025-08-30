export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          active: boolean
          content: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          active: boolean
          condition_type: string
          condition_value: number
          created_at: string
          description: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          condition_type: string
          condition_value: number
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          condition_type?: string
          condition_value?: number
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          points_redeemed: number
          qr_code: string
          reward_description: string
          reward_id: string
          reward_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          points_redeemed: number
          qr_code: string
          reward_description: string
          reward_id: string
          reward_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          points_redeemed?: number
          qr_code?: string
          reward_description?: string
          reward_id?: string
          reward_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_badges: {
        Row: {
          badge_id: string
          customer_id: string
          id: string
          unlocked_at: string
        }
        Insert: {
          badge_id: string
          customer_id: string
          id?: string
          unlocked_at?: string
        }
        Update: {
          badge_id?: string
          customer_id?: string
          id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          points: number | null
          total_points: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          points?: number | null
          total_points?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          points?: number | null
          total_points?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          hero_image_url: string | null
          id: string
          is_active: boolean
          limit_total: number
          pickup_date: string | null
          price_cents: number
          sold_count: number
          starts_at: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          limit_total: number
          pickup_date?: string | null
          price_cents: number
          sold_count?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          limit_total?: number
          pickup_date?: string | null
          price_cents?: number
          sold_count?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          id: string
          offer_id: string
          qty: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id: string
          qty: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string
          qty?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      preorder_items: {
        Row: {
          id: string
          preorder_id: string
          product_id: string
          product_name_cache: string
          qty_int: number
        }
        Insert: {
          id?: string
          preorder_id: string
          product_id: string
          product_name_cache: string
          qty_int: number
        }
        Update: {
          id?: string
          preorder_id?: string
          product_id?: string
          product_name_cache?: string
          qty_int?: number
        }
        Relationships: [
          {
            foreignKeyName: "preorder_items_preorder_id_fkey"
            columns: ["preorder_id"]
            isOneToOne: false
            referencedRelation: "preorders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preorder_items_preorder_id_fkey"
            columns: ["preorder_id"]
            isOneToOne: false
            referencedRelation: "preorders_admin_view"
            referencedColumns: ["preorder_id"]
          },
          {
            foreignKeyName: "preorder_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "preorder_products"
            referencedColumns: ["id"]
          },
        ]
      }
      preorder_products: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          step_int: number
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          step_int?: number
          unit: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          step_int?: number
          unit?: string
        }
        Relationships: []
      }
      preorders: {
        Row: {
          confirmed_pickup_at: string | null
          created_at: string
          desired_pickup_at: string | null
          id: string
          picked_up_at: string | null
          ready_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          confirmed_pickup_at?: string | null
          created_at?: string
          desired_pickup_at?: string | null
          id?: string
          picked_up_at?: string | null
          ready_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          confirmed_pickup_at?: string | null
          created_at?: string
          desired_pickup_at?: string | null
          id?: string
          picked_up_at?: string | null
          ready_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean
        }
        Insert: {
          created_at?: string | null
          id: string
          is_admin?: boolean
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean
        }
        Relationships: []
      }
      rewards: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string
          id: string
          name: string
          points_required: number
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description: string
          id?: string
          name: string
          points_required: number
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string
          id?: string
          name?: string
          points_required?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          claim_id: string | null
          created_at: string | null
          customer_id: string | null
          description: string
          id: string
          points_earned: number
          reward_id: string | null
          scan_uuid: string | null
          type: string | null
        }
        Insert: {
          amount: number
          claim_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description: string
          id?: string
          points_earned: number
          reward_id?: string | null
          scan_uuid?: string | null
          type?: string | null
        }
        Update: {
          amount?: number
          claim_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string
          id?: string
          points_earned?: number
          reward_id?: string | null
          scan_uuid?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pickup_queue_view: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          item_id: string | null
          item_type: string | null
          pickup_code: string | null
          points: number | null
          qty: number | null
          status: string | null
          title: string | null
          user_id: string | null
        }
        Relationships: []
      }
      preorders_admin_view: {
        Row: {
          confirmed_pickup_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          desired_pickup_at: string | null
          picked_up_at: string | null
          preorder_id: string | null
          ready_at: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_cancel_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      admin_cancel_preorder: {
        Args: { p_preorder_id: string }
        Returns: undefined
      }
      admin_confirm_preorder: {
        Args: { p_confirmed_at?: string; p_preorder_id: string }
        Returns: undefined
      }
      admin_mark_picked_up: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      admin_mark_picked_up_preorder: {
        Args: { p_preorder_id: string; p_when?: string }
        Returns: undefined
      }
      admin_mark_ready_preorder: {
        Args: { p_preorder_id: string; p_ready_at?: string }
        Returns: undefined
      }
      admin_pickup_by_code: {
        Args: { p_code: string }
        Returns: undefined
      }
      check_and_award_badges: {
        Args: { customer_uuid: string }
        Returns: number
      }
      create_preorder: {
        Args: { p_desired: string; p_items: Json }
        Returns: string
      }
      purchase_offer: {
        Args: { p_offer_id: string; p_qty?: number }
        Returns: {
          order_id: string
          remaining: number
        }[]
      }
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
