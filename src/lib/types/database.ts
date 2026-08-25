export type PaymentMethod = "cash" | "qris" | "transfer" | "hutang";
export type TransactionStatus = "paid" | "unpaid";
export type MemberRole = "owner" | "staff";

export interface Database {
  public: {
    Tables: {
      warungs: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          address: string | null;
          logo_url: string | null;
          theme_color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          address?: string | null;
          logo_url?: string | null;
          theme_color?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["warungs"]["Insert"]>;
        Relationships: [];
      };
      warung_members: {
        Row: {
          id: string;
          warung_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          warung_id: string;
          user_id: string;
          role?: MemberRole;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["warung_members"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "warung_members_warung_id_fkey";
            columns: ["warung_id"];
            isOneToOne: false;
            referencedRelation: "warungs";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          warung_id: string;
          name: string;
          phone: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          warung_id: string;
          name: string;
          phone?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "customers_warung_id_fkey";
            columns: ["warung_id"];
            isOneToOne: false;
            referencedRelation: "warungs";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          id: string;
          warung_id: string;
          name: string;
          price: number;
          category: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          warung_id: string;
          name: string;
          price?: number;
          category?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "menu_items_warung_id_fkey";
            columns: ["warung_id"];
            isOneToOne: false;
            referencedRelation: "warungs";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          warung_id: string;
          customer_id: string | null;
          payment_method: PaymentMethod;
          status: TransactionStatus;
          total: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          warung_id: string;
          customer_id?: string | null;
          payment_method?: PaymentMethod;
          status?: TransactionStatus;
          total?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["transactions"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "transactions_warung_id_fkey";
            columns: ["warung_id"];
            isOneToOne: false;
            referencedRelation: "warungs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      transaction_items: {
        Row: {
          id: string;
          transaction_id: string;
          menu_item_id: string | null;
          menu_name: string;
          price: number;
          qty: number;
          subtotal: number;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          menu_item_id?: string | null;
          menu_name: string;
          price: number;
          qty: number;
          subtotal: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["transaction_items"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "transaction_items_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_items_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          warung_id: string;
          category: string;
          description: string | null;
          amount: number;
          expense_date: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          warung_id: string;
          category?: string;
          description?: string | null;
          amount?: number;
          expense_date?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "expenses_warung_id_fkey";
            columns: ["warung_id"];
            isOneToOne: false;
            referencedRelation: "warungs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_warung_member: {
        Args: { _warung_id: string };
        Returns: boolean;
      };
      is_warung_owner: {
        Args: { _warung_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Warung = Database["public"]["Tables"]["warungs"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionItem =
  Database["public"]["Tables"]["transaction_items"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
