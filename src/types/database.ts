export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      days: {
        Row: {
          created_at: string;
          date: string;
          frozen_at: string | null;
          initial_prompt: string;
          metadata: Json;
          opened_at: string | null;
          status: "scheduled" | "live" | "frozen";
        };
        Insert: {
          created_at?: string;
          date: string;
          frozen_at?: string | null;
          initial_prompt: string;
          metadata?: Json;
          opened_at?: string | null;
          status?: "scheduled" | "live" | "frozen";
        };
        Update: {
          created_at?: string;
          date?: string;
          frozen_at?: string | null;
          initial_prompt?: string;
          metadata?: Json;
          opened_at?: string | null;
          status?: "scheduled" | "live" | "frozen";
        };
        Relationships: [];
      };
      drawings: {
        Row: {
          created_at: string;
          day: string;
          depth: number;
          id: number;
          parent_guess_id: number | null;
          player_id: string | null;
          status: "pending" | "visible" | "rejected" | "pruned";
          strokes: Json;
        };
        Insert: {
          created_at?: string;
          day: string;
          depth?: number;
          id?: number;
          parent_guess_id?: number | null;
          player_id?: string | null;
          status?: "pending" | "visible" | "rejected" | "pruned";
          strokes: Json;
        };
        Update: {
          created_at?: string;
          day?: string;
          depth?: number;
          id?: number;
          parent_guess_id?: number | null;
          player_id?: string | null;
          status?: "pending" | "visible" | "rejected" | "pruned";
          strokes?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "drawings_day_fkey";
            columns: ["day"];
            isOneToOne: false;
            referencedRelation: "days";
            referencedColumns: ["date"];
          },
          {
            foreignKeyName: "drawings_parent_guess_same_day_fkey";
            columns: ["day", "parent_guess_id"];
            isOneToOne: false;
            referencedRelation: "guesses";
            referencedColumns: ["day", "id"];
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
          created_at: string;
          day: string;
          depth: number;
          drawing_id: number;
          id: number;
          player_id: string | null;
          text: string;
        };
        Insert: {
          created_at?: string;
          day: string;
          depth?: number;
          drawing_id: number;
          id?: number;
          player_id?: string | null;
          text: string;
        };
        Update: {
          created_at?: string;
          day?: string;
          depth?: number;
          drawing_id?: number;
          id?: number;
          player_id?: string | null;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guesses_day_fkey";
            columns: ["day"];
            isOneToOne: false;
            referencedRelation: "days";
            referencedColumns: ["date"];
          },
          {
            foreignKeyName: "guesses_drawing_same_day_fkey";
            columns: ["day", "drawing_id"];
            isOneToOne: false;
            referencedRelation: "drawings";
            referencedColumns: ["day", "id"];
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
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
