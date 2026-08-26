export type TreasuryItemType = 'depense' | 'recette';

export interface TreasuryItem {
  id: string;
  type: TreasuryItemType;
  label: string;
  amount: number;
  date?: string; // ISO date (yyyy-mm-dd), optionnelle
}

export interface TreasuryItemInput {
  type: TreasuryItemType;
  label: string;
  amount: number;
  date?: string;
}
