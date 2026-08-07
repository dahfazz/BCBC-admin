import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'bcs-planning-notes';

@Injectable({ providedIn: 'root' })
export class PlanningNotesService {
  notes = signal<Record<string, string>>(this.load());

  private load(): Record<string, string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notes()));
  }

  set(weekKey: string, text: string): void {
    this.notes.update((map) => ({ ...map, [weekKey]: text }));
    this.persist();
  }
}
