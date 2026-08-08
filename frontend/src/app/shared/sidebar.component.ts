import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TodoService } from './todo.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private todoService = inject(TodoService);
  private auth = inject(AuthService);
  private router = inject(Router);

  user = this.auth.user;
  todos = this.todoService.todos;
  newTodo = '';

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
