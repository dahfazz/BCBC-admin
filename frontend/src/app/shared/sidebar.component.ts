import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TodoService } from './todo.service';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private todoService = inject(TodoService);

  todos = this.todoService.todos;
  newTodo = '';

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
