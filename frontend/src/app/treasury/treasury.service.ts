import { Injectable, signal } from '@angular/core';
import { TreasuryItem } from './treasury.model';

const DEPENSES_KEY = 'bcs-treasury-depenses';
const RECETTES_KEY = 'bcs-treasury-recettes';

@Injectable({ providedIn: 'root' })
export class TreasuryService {
  depenses = signal<TreasuryItem[]>(this.load(DEPENSES_KEY));
  recettes = signal<TreasuryItem[]>(this.load(RECETTES_KEY));

  private load(key: string): TreasuryItem[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private persist(key: string, items: TreasuryItem[]): void {
    localStorage.setItem(key, JSON.stringify(items));
  }

  addDepense(label: string, amount: number, date?: string): void {
    this.depenses.update((list) => [...list, { id: crypto.randomUUID(), label, amount, date }]);
    this.persist(DEPENSES_KEY, this.depenses());
  }

  removeDepense(id: string): void {
    this.depenses.update((list) => list.filter((i) => i.id !== id));
    this.persist(DEPENSES_KEY, this.depenses());
  }

  addRecette(label: string, amount: number, date?: string): void {
    this.recettes.update((list) => [...list, { id: crypto.randomUUID(), label, amount, date }]);
    this.persist(RECETTES_KEY, this.recettes());
  }

  removeRecette(id: string): void {
    this.recettes.update((list) => list.filter((i) => i.id !== id));
    this.persist(RECETTES_KEY, this.recettes());
  }
}
