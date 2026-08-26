import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar.component';
import { PageNavComponent } from '../shared/page-nav.component';
import {
  PlanningEventOverride,
  PlanningEventPayload,
  PlanningSession,
  PlanningWeek,
  SessionType,
  buildSeasonPlanning,
  isTemplateId,
  mergeOverrides,
  overrideToPayload,
  toISODate,
  vacationFor,
} from './planning.model';
import { PlanningNotesService } from './planning-notes.service';
import { PlanningEventsService } from './planning-events.service';

interface PlanningDay {
  dayIndex: number;
  dayLabel: string;
  date: Date;
  sessions: PlanningSession[];
}

const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAY_START_MIN = 8 * 60;
const DAY_END_MIN = 23 * 60;
const PX_PER_MIN = 0.9;

function toMinutes(time: string): number {
  const m = time.match(/^(\d{1,2})[h:](\d{2})$/);
  if (!m) return DAY_START_MIN;
  return Number(m[1]) * 60 + Number(m[2]);
}

function toInputTime(time: string): string {
  const m = time.match(/^(\d{1,2})[h:](\d{2})$/);
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function toDisplayTime(inputValue: string): string {
  const [h, mnt] = inputValue.split(':');
  if (!h || !mnt) return '';
  return `${Number(h)}h${mnt}`;
}

@Component({
  selector: 'app-planning',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, PageNavComponent],
  templateUrl: './planning.component.html',
  styleUrl: './planning.component.scss',
})
export class PlanningComponent implements OnInit {
  private fb = inject(FormBuilder);
  private notesService = inject(PlanningNotesService);
  private eventsService = inject(PlanningEventsService);

  readonly seasonLabel = 'Saison 2026 – 2027';
  readonly dayLabels = DAY_LABELS;
  readonly hours = Array.from({ length: (DAY_END_MIN - DAY_START_MIN) / 60 + 1 }, (_, i) => 8 + i);
  readonly timelineHeight = (DAY_END_MIN - DAY_START_MIN) * PX_PER_MIN;

  private readonly baseWeeks: PlanningWeek[] = buildSeasonPlanning(
    new Date(2026, 8, 1), // 1er septembre 2026
    new Date(2027, 7, 31), // 31 août 2027
  );

  overrides = signal<PlanningEventOverride[]>([]);
  loadError = signal('');

  weeks = computed(() => mergeOverrides(this.baseWeeks, this.overrides()));

  notes = this.notesService.notes;

  panelOpen = signal(false);
  editingSession = signal<PlanningSession | null>(null);
  saving = signal(false);
  formError = signal('');

  deleteTarget = signal<PlanningSession | null>(null);
  deleting = signal(false);

  form = this.fb.group({
    date: ['', Validators.required],
    category: ['', Validators.required],
    label: ['', Validators.required],
    type: ['entrainement' as SessionType, Validators.required],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    coach: [''],
    opponent: [''],
    scoreFor: [null as number | null],
    scoreAgainst: [null as number | null],
  });

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loadError.set('');
    this.eventsService.list().subscribe({
      next: (res) => this.overrides.set(res.events),
      error: () => this.loadError.set('Impossible de charger les événements du planning.'),
    });
  }

  formatWeekRange(week: PlanningWeek): string {
    const start = this.formatDate(week.weekStart);
    const end = this.formatDate(week.weekEnd);
    return `Semaine du ${start} au ${end}`;
  }

  formatSessionDate(session: PlanningSession): string {
    return this.formatDayDate(session.date);
  }

  formatDayDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  vacationLabel(session: PlanningSession): string | undefined {
    return vacationFor(session.date)?.label;
  }

  weekKey(week: PlanningWeek): string {
    return toISODate(week.weekStart);
  }

  updateNote(week: PlanningWeek, value: string): void {
    this.notesService.set(this.weekKey(week), value);
  }

  weekDays(week: PlanningWeek): PlanningDay[] {
    const days: PlanningDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(week.weekStart);
      date.setDate(date.getDate() + i);
      const sessions = week.sessions
        .filter((s) => s.day === i + 1)
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
      days.push({ dayIndex: i + 1, dayLabel: DAY_LABELS[i], date, sessions });
    }
    return days;
  }

  eventStyle(session: PlanningSession): Record<string, string> {
    const rawStart = toMinutes(session.startTime);
    const start = Math.min(Math.max(rawStart, DAY_START_MIN), DAY_END_MIN);
    const rawEnd = Math.max(toMinutes(session.endTime), rawStart + 15);
    const end = Math.min(Math.max(rawEnd, DAY_START_MIN), DAY_END_MIN);
    const top = (start - DAY_START_MIN) * PX_PER_MIN;
    const height = Math.max((end - start) * PX_PER_MIN, 26);
    return { top: `${top}px`, height: `${height}px` };
  }

  hourOffset(hour: number): number {
    return (hour * 60 - DAY_START_MIN) * PX_PER_MIN;
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c.touched);
  }

  isMatch(): boolean {
    return this.form.get('type')?.value === 'match';
  }

  openAddEvent(week: PlanningWeek, date?: Date): void {
    this.editingSession.set(null);
    this.formError.set('');
    const d = date ?? week.weekStart;
    this.form.reset({
      date: toISODate(d),
      category: '',
      label: '',
      type: 'entrainement',
      startTime: '18:00',
      endTime: '19:00',
      coach: '',
      opponent: '',
      scoreFor: null,
      scoreAgainst: null,
    });
    this.panelOpen.set(true);
  }

  openEditEvent(session: PlanningSession): void {
    this.editingSession.set(session);
    this.formError.set('');
    this.form.reset({
      date: toISODate(session.date),
      category: session.category,
      label: session.label,
      type: session.type,
      startTime: toInputTime(session.startTime),
      endTime: toInputTime(session.endTime),
      coach: session.coach,
      opponent: session.opponent ?? '',
      scoreFor: session.scoreFor ?? null,
      scoreAgainst: session.scoreAgainst ?? null,
    });
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  saveEvent(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const v = this.form.getRawValue();
    const [y, m, d] = (v.date ?? '').split('-').map(Number);
    const date = new Date(y, (m ?? 1) - 1, d ?? 1);
    const dow = date.getDay() || 7;
    const existing = this.editingSession();
    const id = existing ? existing.id : crypto.randomUUID();

    const payload: PlanningEventPayload = {
      date: v.date ?? '',
      dayLabel: DAY_LABELS[dow - 1],
      category: v.category ?? '',
      label: v.label ?? '',
      startTime: toDisplayTime(v.startTime ?? ''),
      endTime: toDisplayTime(v.endTime ?? ''),
      coach: v.coach ?? '',
      type: (v.type ?? 'entrainement') as SessionType,
      opponent: v.opponent ?? '',
      scoreFor: v.scoreFor === null || v.scoreFor === undefined ? null : Number(v.scoreFor),
      scoreAgainst: v.scoreAgainst === null || v.scoreAgainst === undefined ? null : Number(v.scoreAgainst),
      cancelled: false,
    };

    this.eventsService.upsert(id, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.panelOpen.set(false);
        this.loadEvents();
      },
      error: () => {
        this.saving.set(false);
        this.formError.set("Échec de l'enregistrement de l'événement.");
      },
    });
  }

  confirmDelete(session: PlanningSession): void {
    this.panelOpen.set(false);
    this.deleteTarget.set(session);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  deleteEvent(): void {
    const session = this.deleteTarget();
    if (!session) return;
    this.deleting.set(true);

    const done = () => {
      this.deleting.set(false);
      this.deleteTarget.set(null);
      this.loadEvents();
    };

    if (isTemplateId(session.id)) {
      this.eventsService.upsert(session.id, overrideToPayload(session, true)).subscribe({ next: done, error: done });
    } else {
      this.eventsService.remove(session.id).subscribe({ next: done, error: done });
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
