import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CATEGORIES, Member, categoryLabel } from '../members/member.model';
import { MemberService } from '../members/member.service';
import { TodoService } from './todo.service';
import { AuthService } from '../auth/auth.service';
import { MAX_ADHERENTS } from '../app';

export type Category = 'U7' | 'U9' | 'U11' | 'U13' | 'LOISIR' | 'FSGT' | '';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit {
  private todoService = inject(TodoService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private memberService = inject(MemberService);

  public readonly MAX_ADHERENTS = MAX_ADHERENTS;

  readonly categoryLinks = [
    'U7/U9',
    ...CATEGORIES.filter((category) => category !== 'U7' && category !== 'U9'),
  ];

  readonly categoryLabel = categoryLabel;

  private members = signal<Member[]>([]);

  private groupLabel(categorie: Category): string {
    return categorie === 'U7' || categorie === 'U9' ? 'U7/U9' : categorie || 'Autre';
  }

  readonly categoryCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const m of this.members()) {
      const label = this.groupLabel(m.categorie);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return counts;
  });

  user = this.auth.user;
  todos = this.todoService.todos;
  newTodo = '';

  ngOnInit(): void {
    this.memberService.list().subscribe({
      next: (res) => this.members.set(res.members),
      error: () => this.members.set([]),
    });
  }

  categoryCount(category: string): number {
    return this.categoryCounts().get(category) ?? 0;
  }

  goToCategory(category: string): void {
    void this.router.navigate(['/adherents'], {
      queryParams: { category },
    });
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.router.navigateByUrl('/login');
  }

  addTodo(): void {
    this.todoService.add(this.newTodo);
    this.newTodo = '';
  }

  toggleTodo(id: string): void {
    this.todoService.toggle(id);
  }

  removeTodo(id: string): void {
    this.todoService.remove(id);
  }
}
