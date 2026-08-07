import { Injectable, signal } from '@angular/core';
import { TodoItem } from './todo.model';

const STORAGE_KEY = 'bcs-sidebar-todos';

@Injectable({ providedIn: 'root' })
export class TodoService {
  todos = signal<TodoItem[]>(this.load());

  private load(): TodoItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.todos()));
  }

  add(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.todos.update((list) => [...list, { id: crypto.randomUUID(), text: trimmed, done: false }]);
    this.persist();
  }

  toggle(id: string): void {
    this.todos.update((list) =>
      list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
    this.persist();
  }

  remove(id: string): void {
    this.todos.update((list) => list.filter((t) => t.id !== id));
    this.persist();
  }
}
