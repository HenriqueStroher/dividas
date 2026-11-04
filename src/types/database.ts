// Espelha o schema em supabase/migrations, no formato de `npm run db:types`.
// Com o Supabase local rodando, esse comando regenera este arquivo.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      people: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      debts: {
        Row: {
          id: string;
          user_id: string;
          direction: Database["public"]["Enums"]["debt_direction"];
          total_cents: number;
          self_share_cents: number;
          description: string;
          occurred_on: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          direction: Database["public"]["Enums"]["debt_direction"];
          total_cents: number;
          self_share_cents?: number;
          description: string;
          occurred_on?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          direction?: Database["public"]["Enums"]["debt_direction"];
          total_cents?: number;
          self_share_cents?: number;
          description?: string;
          occurred_on?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      debt_shares: {
        Row: {
          id: string;
          user_id: string;
          debt_id: string;
          person_id: string;
          amount_cents: number;
          position: number;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          debt_id: string;
          person_id: string;
          amount_cents: number;
          position: number;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          debt_id?: string;
          person_id?: string;
          amount_cents?: number;
          position?: number;
          paid_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "debt_shares_debt_id_user_id_fkey";
            columns: ["debt_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "debts";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "debt_shares_person_id_user_id_fkey";
            columns: ["person_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: {
      person_balances: {
        Row: {
          person_id: string | null;
          name: string | null;
          receivable_cents: number | null;
          payable_cents: number | null;
          net_cents: number | null;
        };
        Relationships: [];
      };
      debt_share_details: {
        Row: {
          share_id: string | null;
          debt_id: string | null;
          person_id: string | null;
          person_name: string | null;
          direction: Database["public"]["Enums"]["debt_direction"] | null;
          amount_cents: number | null;
          total_cents: number | null;
          self_share_cents: number | null;
          description: string | null;
          occurred_on: string | null;
          created_at: string | null;
          paid_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      assert_valid_shares: {
        Args: { p_total_cents: number; p_self_share_cents: number; p_shares: Json };
        Returns: undefined;
      };
      create_debt: {
        Args: {
          p_direction: Database["public"]["Enums"]["debt_direction"];
          p_total_cents: number;
          p_self_share_cents: number;
          p_description: string;
          p_occurred_on: string;
          p_shares: Json;
        };
        Returns: string;
      };
      update_debt: {
        Args: {
          p_debt_id: string;
          p_direction: Database["public"]["Enums"]["debt_direction"];
          p_total_cents: number;
          p_self_share_cents: number;
          p_description: string;
          p_occurred_on: string;
          p_shares: Json;
        };
        Returns: undefined;
      };
      delete_person: {
        Args: { p_person_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      debt_direction: "i_owe" | "owed_to_me";
    };
    CompositeTypes: Record<never, never>;
  };
};
