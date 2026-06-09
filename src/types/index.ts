export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "cash" | "ewallet";
  balance: number;
  currency: string;
  color_tag?: string;
  is_archived: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id?: string | null;
  amount: number;
  description?: string;
  category: string;
  date: string;
  tags?: string[];
  is_anomaly?: boolean;
  ai_category_override?: boolean;
  created_at: string;
  deleted_at?: string | null;
}

export interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
  spent: number;
  month: string;
}

export interface AIInsight {
  id: string;
  insight_type: string;
  content: string;
  data?: any;
  generated_at: string;
}