export type PaymentMethod = "cash" | "qris" | "transfer" | "hutang";
export type TransactionStatus = "paid" | "unpaid";
export type MemberRole =
  | "owner"
  | "staff"
  | "admin"
  | "manager"
  | "supervisor"
  | "cashier"
  | "kitchen"
  | "inventory"
  | "finance";
export type StockMovementType = "sale" | "restock" | "adjustment" | "waste";
export type UnitCategory = "weight" | "volume" | "count";
export type IngredientMovementType =
  | "purchase"
  | "consumption"
  | "adjustment"
  | "waste"
  | "opening";

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
          background_url: string | null;
          theme_color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          address?: string | null;
          logo_url?: string | null;
          background_url?: string | null;
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
          outlet_id: string | null;
          name: string;
          phone: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          warung_id: string;
          outlet_id?: string | null;
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
          outlet_id: string | null;
          name: string;
          price: number;
          category: string;
          is_active: boolean;
          stock_quantity: number;
          stock_unit: string;
          hpp: number;
          hpp_updated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          warung_id: string;
          outlet_id?: string | null;
          name: string;
          price?: number;
          category?: string;
          is_active?: boolean;
          stock_quantity?: number;
          stock_unit?: string;
          hpp?: number;
          hpp_updated_at?: string | null;
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
      stock_movements: {
        Row: {
          id: string;
          warung_id: string;
          menu_item_id: string;
          quantity_change: number;
          type: StockMovementType;
          reason: string | null;
          actor: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          warung_id: string;
          menu_item_id: string;
          quantity_change: number;
          type: StockMovementType;
          reason?: string | null;
          actor?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["stock_movements"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "stock_movements_warung_id_fkey";
            columns: ["warung_id"];
            isOneToOne: false;
            referencedRelation: "warungs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          warung_id: string;
          outlet_id: string | null;
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
          outlet_id?: string | null;
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
          cogs: number;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          menu_item_id?: string | null;
          menu_name: string;
          price: number;
          qty: number;
          subtotal: number;
          cogs?: number;
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
          outlet_id: string | null;
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
          outlet_id?: string | null;
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
      daily_sales_summary: {
        Row: {
          id: string;
          warung_id: string;
          summary_date: string;
          gross_revenue: number;
          transaction_count: number;
          item_quantity: number;
          cogs: number;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "daily_sales_summary_warung_id_fkey";
            columns: ["warung_id"];
            isOneToOne: false;
            referencedRelation: "warungs";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_sales_summary: {
        Row: {
          id: string;
          warung_id: string;
          summary_month: string;
          gross_revenue: number;
          transaction_count: number;
          item_quantity: number;
          cogs: number;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "monthly_sales_summary_warung_id_fkey";
            columns: ["warung_id"];
            isOneToOne: false;
            referencedRelation: "warungs";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_expense_summary: {
        Row: {
          id: string;
          warung_id: string;
          summary_date: string;
          category: string;
          amount: number;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "daily_expense_summary_warung_id_fkey";
            columns: ["warung_id"];
            isOneToOne: false;
            referencedRelation: "warungs";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_expense_summary: {
        Row: {
          id: string;
          warung_id: string;
          summary_month: string;
          category: string;
          amount: number;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "monthly_expense_summary_warung_id_fkey";
            columns: ["warung_id"];
            isOneToOne: false;
            referencedRelation: "warungs";
            referencedColumns: ["id"];
          },
        ];
      };
      outlets: {
        Row: {
          id: string;
          warung_id: string;
          name: string;
          address: string | null;
          is_active: boolean;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          warung_id: string;
          name: string;
          address?: string | null;
          is_active?: boolean;
          is_default?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["outlets"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "outlets_warung_id_fkey";
            columns: ["warung_id"];
            isOneToOne: false;
            referencedRelation: "warungs";
            referencedColumns: ["id"];
          },
        ];
      };
      member_outlet_access: {
        Row: {
          id: string;
          member_id: string;
          outlet_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          outlet_id: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["member_outlet_access"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "member_outlet_access_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "warung_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_outlet_access_outlet_id_fkey";
            columns: ["outlet_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
        ];
      };
      units: {
        Row: {
          id: string;
          code: string;
          name: string;
          category: UnitCategory;
          to_base_factor: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          category: UnitCategory;
          to_base_factor: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["units"]["Insert"]>;
        Relationships: [];
      };
      ingredients: {
        Row: {
          id: string;
          warung_id: string;
          outlet_id: string | null;
          name: string;
          base_unit_id: string;
          cost_per_base_unit: number;
          current_stock: number;
          min_stock: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          warung_id: string;
          outlet_id?: string | null;
          name: string;
          base_unit_id: string;
          cost_per_base_unit?: number;
          current_stock?: number;
          min_stock?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ingredients"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "ingredients_warung_id_fkey";
            columns: ["warung_id"];
            isOneToOne: false;
            referencedRelation: "warungs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ingredients_base_unit_id_fkey";
            columns: ["base_unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      ingredient_stock_movements: {
        Row: {
          id: string;
          warung_id: string;
          ingredient_id: string;
          quantity_change: number;
          type: IngredientMovementType;
          reference_id: string | null;
          reason: string | null;
          actor: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          warung_id: string;
          ingredient_id: string;
          quantity_change: number;
          type: IngredientMovementType;
          reference_id?: string | null;
          reason?: string | null;
          actor?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "ingredient_stock_movements_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
        ];
      };
      recipes: {
        Row: {
          id: string;
          warung_id: string;
          menu_item_id: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          warung_id: string;
          menu_item_id: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "recipes_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: true;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_items: {
        Row: {
          id: string;
          recipe_id: string;
          ingredient_id: string;
          quantity: number;
          unit_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          ingredient_id: string;
          quantity: number;
          unit_id: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["recipe_items"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "recipe_items_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_items_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
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
      create_transaction: {
        Args: {
          _warung_id: string;
          _customer_id: string | null;
          _payment_method: string;
          _items: { menu_item_id: string; qty: number }[];
        };
        Returns: string;
      };
      restock_menu_item: {
        Args: {
          _warung_id: string;
          _menu_item_id: string;
          _quantity: number;
          _reason: string | null;
        };
        Returns: number;
      };
      rebuild_finance_summary: {
        Args: { _warung_id: string; _from_date: string; _to_date: string };
        Returns: undefined;
      };
      default_outlet_id: {
        Args: { _warung_id: string };
        Returns: string;
      };
      has_outlet_access: {
        Args: { _outlet_id: string };
        Returns: boolean;
      };
      convert_unit: {
        Args: { _qty: number; _from_unit_id: string; _to_unit_id: string };
        Returns: number;
      };
      calculate_recipe_cost: {
        Args: { _menu_item_id: string };
        Returns: number;
      };
      recompute_menu_hpp: {
        Args: { _menu_item_id: string };
        Returns: undefined;
      };
      adjust_ingredient_stock: {
        Args: {
          _warung_id: string;
          _ingredient_id: string;
          _quantity_change: number;
          _type: string;
          _reason: string | null;
        };
        Returns: number;
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
export type StockMovement =
  Database["public"]["Tables"]["stock_movements"]["Row"];
export type DailySalesSummary =
  Database["public"]["Tables"]["daily_sales_summary"]["Row"];
export type MonthlySalesSummary =
  Database["public"]["Tables"]["monthly_sales_summary"]["Row"];
export type DailyExpenseSummary =
  Database["public"]["Tables"]["daily_expense_summary"]["Row"];
export type MonthlyExpenseSummary =
  Database["public"]["Tables"]["monthly_expense_summary"]["Row"];
export type Outlet = Database["public"]["Tables"]["outlets"]["Row"];
export type MemberOutletAccess =
  Database["public"]["Tables"]["member_outlet_access"]["Row"];
export type Unit = Database["public"]["Tables"]["units"]["Row"];
export type Ingredient = Database["public"]["Tables"]["ingredients"]["Row"];
export type IngredientStockMovement =
  Database["public"]["Tables"]["ingredient_stock_movements"]["Row"];
export type Recipe = Database["public"]["Tables"]["recipes"]["Row"];
export type RecipeItem = Database["public"]["Tables"]["recipe_items"]["Row"];
