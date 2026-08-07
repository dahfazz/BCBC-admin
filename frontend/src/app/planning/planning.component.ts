import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar.component';
import { buildSeasonPlanning, PlanningSession, PlanningWeek, vacationFor } from './planning.model';
import { PlanningNotesService } from './planning-notes.service';

@Component({
  selector: 'app-planning',
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './planning.component.html',
  styleUrl: './planning.component.scss',
})
export class PlanningComponent {
  private notesService = inject(PlanningNotesService);

  readonly seasonLabel = 'Saison 2026 – 2027';

  readonly weeks: PlanningWeek[] = buildSeasonPlanning(
    new Date(2026, 8, 1), // 1er septembre 2026
    new Date(2027, 7, 31), // 31 août 2027
  );

  notes = this.notesService.notes;

  formatWeekRange(week: PlanningWeek): string {
    const start = this.formatDate(week.weekStart);
    const end = this.formatDate(week.weekEnd);
    return `Semaine du ${start} au ${end}`;
  }

  formatSessionDate(session: PlanningSession): string {
    return session.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  vacationLabel(session: PlanningSession): string | undefined {
    return vacationFor(session.date)?.label;
  }

  weekKey(week: PlanningWeek): string {
    return week.weekStart.toISOString().slice(0, 10);
  }

  updateNote(week: PlanningWeek, value: string): void {
    this.notesService.set(this.weekKey(week), value);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
