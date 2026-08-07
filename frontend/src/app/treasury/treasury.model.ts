export interface TreasuryItem {
  id: string;
  label: string;
  amount: number;
  date?: string; // ISO date (yyyy-mm-dd), optionnelle
}
