import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'bcs-sidebar-collapsed';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  collapsed = signal<boolean>(this.load());

  private load(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, this.collapsed() ? '1' : '0');
  }

  toggle(): void {
    this.collapsed.update((v) => !v);
    this.persist();
  }
}
