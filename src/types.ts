export interface Payment {
  id: string;
  person_id: string;
  amount: number;
  paid_on: string;
  note?: string | null;
  created_at: string;
}

export interface Person {
  id: string;
  record_id: string;
  name: string;
  phone?: string | null;
  user_id?: string | null;
  payments: Payment[];
  created_at: string;
}

export interface RecordItem {
  id: string;
  title: string;
  target?: number | null; // target amount per person in Naira
  end_date?: string | null;
  show_table: boolean; // whether visitors can see the comparative group table
  group_link: boolean; // whether group link allows choosing name
  owner_id?: string | null;
  created_at: string;
  people: Person[];
}

export type DebtType = 'receivable' | 'payable';

export interface DebtRepayment {
  id: string;
  debt_id: string;
  amount: number;
  paid_on: string;
  note?: string | null;
  created_at: string;
}

export interface DebtItem {
  id: string;
  type: DebtType;
  person_name: string;
  phone?: string | null;
  original_amount: number;
  due_date?: string | null;
  notes?: string | null;
  repayments: DebtRepayment[];
  created_at: string;
}

export interface UserAccount {
  id: string;
  email: string;
  name?: string;
}
