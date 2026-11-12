export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      assignments: {
        Row: {
          day_id: string;
          drawing_id: number | null;
          expires_at: string;
          guess_id: number | null;
          id: string;
          issued_at: string;
          outcome: string | null;
          player_id: string;
        };
        Insert: {
          day_id: string;
          drawing_id?: number | null;
          expires_at: string;
          guess_id?: number | null;
          id?: string;
          issued_at?: string;
          outcome?: string | null;
          player_id: string;
        };
        Update: {
          day_id?: string;
          drawing_id?: number | null;
          expires_at?: string;
          guess_id?: number | null;
          id?: string;
          issued_at?: string;
          outcome?: string | null;
          player_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_drawing_id_fkey";
            columns: ["drawing_id"];
            isOneToOne: false;
            referencedRelation: "drawings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_guess_id_fkey";
            columns: ["guess_id"];
            isOneToOne: false;
            referencedRelation: "guesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      days: {
        Row: {
          created_at: string;
          date: string;
          frozen_at: string | null;
          id: string;
          initial_prompt: string;
          opened_at: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          frozen_at?: string | null;
          id?: string;
          initial_prompt: string;
          opened_at?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          frozen_at?: string | null;
          id?: string;
          initial_prompt?: string;
          opened_at?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      drawings: {
        Row: {
          created_at: string;
          day: string;
          day_id: string;
          depth: number;
          height: number;
          id: number;
          parent_guess_id: number | null;
          player_id: string | null;
          status: string;
          strokes: Json;
        };
        Insert: {
          created_at?: string;
          day: string;
          day_id: string;
          depth?: number;
          height?: number;
          id?: number;
          parent_guess_id?: number | null;
          player_id?: string | null;
          status?: string;
          strokes: Json;
        };
        Update: {
          created_at?: string;
          day?: string;
          day_id?: string;
          depth?: number;
          height?: number;
          id?: number;
          parent_guess_id?: number | null;
          player_id?: string | null;
          status?: string;
          strokes?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "drawings_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drawings_parent_guess_same_day_fkey";
            columns: ["day_id", "parent_guess_id"];
            isOneToOne: false;
            referencedRelation: "guesses";
            referencedColumns: ["day_id", "id"];
          },
          {
            foreignKeyName: "drawings_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      guesses: {
        Row: {
          cluster_id: number | null;
          created_at: string;
          day: string;
          day_id: string;
          depth: number;
          drawing_id: number;
          embedding: string | null;
          height: number;
          id: number;
          player_id: string | null;
          text: string;
        };
        Insert: {
          cluster_id?: number | null;
          created_at?: string;
          day: string;
          day_id: string;
          depth?: number;
          drawing_id: number;
          embedding?: string | null;
          height?: number;
          id?: number;
          player_id?: string | null;
          text: string;
        };
        Update: {
          cluster_id?: number | null;
          created_at?: string;
          day?: string;
          day_id?: string;
          depth?: number;
          drawing_id?: number;
          embedding?: string | null;
          height?: number;
          id?: number;
          player_id?: string | null;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guesses_cluster_same_day_fkey";
            columns: ["day_id", "cluster_id"];
            isOneToOne: false;
            referencedRelation: "guesses";
            referencedColumns: ["day_id", "id"];
          },
          {
            foreignKeyName: "guesses_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guesses_drawing_same_day_fkey";
            columns: ["day_id", "drawing_id"];
            isOneToOne: false;
            referencedRelation: "drawings";
            referencedColumns: ["day_id", "id"];
          },
          {
            foreignKeyName: "guesses_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      heartbeat: {
        Row: {
          last: string;
        };
        Insert: {
          last?: string;
        };
        Update: {
          last?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          created_at: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
