import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MemberService } from './member.service';
import {
  Member,
  MemberInput,
  CATEGORIES,
  categoryLabel,
  emptyMember,
  Category,
} from './member.model';
import { PageNavComponent } from '../shared/page-nav.component';
import { DEFAULT_COTISATION_DUE } from '../app';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-members-list',
  imports: [CommonModule, ReactiveFormsModule, PageNavComponent],
  templateUrl: './members-list.component.html',
  styleUrl: './members-list.component.scss',
})
export class MembersListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private memberService = inject(MemberService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public MISSING_DATES = 'missing-date';
  public MISSING_PAYMENTS = 'missing-payments';
  public FEMALES = 'feminine-only';
  public FBI = 'fbi-missing';

  readonly categories = CATEGORIES;
  readonly categoryLabel = categoryLabel;

  members = signal<Member[]>([]);
  loading = signal(false);
  loadError = signal('');

  sortState = signal<{
    key: 'nom' | 'dateNaissance' | 'categorie' | 'email' | 'cotisationDue';
    direction: 'asc' | 'desc';
  }>({
    key: 'nom',
    direction: 'asc',
  });

  searchTerm = signal('');
  private matchesCategoryFilter(member: Member, category: string): boolean {
    if (category === 'u7/u9') {
      return member.categorie === 'U7' || member.categorie === 'U9';
    }
    return member.categorie === category;
  }

  filteredMembers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.members();
    if (!term) return list;

    const exactCategory = this.categories.find((c) => c.toLowerCase() === term);
    if (exactCategory) {
      return list.filter((m) => m.categorie === exactCategory);
    }

    const groupedCategory = 'u7/u9';
    if (term === groupedCategory) {
      return list.filter((m) => this.matchesCategoryFilter(m, groupedCategory));
    }

    switch (term) {
      case this.MISSING_DATES:
        return list.filter((m) => !m.dateNaissance || m.dateNaissance.trim() === '');
      case this.MISSING_PAYMENTS:
        return list.filter((m) => m.cotisationDue > 0);
      case this.FEMALES:
        return list.filter((m) => m.sexe === 'F');
      case this.FBI:
        return list.filter(
          (m) => !m.FBI && m.categorie !== 'FSGT' && m.categorie !== 'WAITING_LIST',
        );
      default:
        return list.filter((m) =>
          `${m.nom} ${m.prenom} ${m.email} ${m.categorie}`.toLowerCase().includes(term),
        );
    }
  });

  sortedMembers = computed(() => {
    const list = [...this.filteredMembers()];
    const { key, direction } = this.sortState();

    list.sort((a, b) => {
      const compare = this.compareMembers(a, b, key);
      return direction === 'asc' ? compare : -compare;
    });

    return list;
  });

  public sold(): void {
    this.form.controls.cotisationDue.setValue(0);
    this.form.controls.cotisationPayee.setValue(DEFAULT_COTISATION_DUE);
  }

  private compareMembers(a: Member, b: Member, key: string): number {
    switch (key) {
      case 'dateNaissance': {
        const dateA = a.dateNaissance
          ? new Date(a.dateNaissance).getTime()
          : Number.MAX_SAFE_INTEGER;
        const dateB = b.dateNaissance
          ? new Date(b.dateNaissance).getTime()
          : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      }
      case 'categorie':
        return String(a.categorie || '').localeCompare(String(b.categorie || ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      case 'email':
        return String(a.email || '').localeCompare(String(b.email || ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      case 'cotisationDue':
        return Number(a.cotisationDue || 0) - Number(b.cotisationDue || 0);
      case 'nom':
        return String(a.nom || '').localeCompare(String(b.nom || ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      default:
        return String(a.nom || '').localeCompare(String(b.nom || ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
    }
  }

  summary = computed(() => {
    const list = this.members();
    const filteredList = this.filteredMembers();
    const totalPaid = list.reduce((sum, m) => sum + (Number(m.cotisationPayee) || 0), 0);
    const totalDue = list.reduce((sum, m) => sum + (Number(m.cotisationDue) || 0), 0);
    return {
      total: filteredList.length,
      totalPaid,
      totalDue,
      totalCotisations: totalPaid + totalDue,
    };
  });

  public getMemberLetters(member: Member): string {
    const prenomInitial = member.prenom ? member.prenom.charAt(0).toUpperCase() : '';
    const nomInitial = member.nom ? member.nom.charAt(0).toUpperCase() : '';
    return `${prenomInitial}${nomInitial}`;
  }

  private groupLabel(categorie: string): string {
    return categorie === 'U7' || categorie === 'U9' ? 'U7/U9' : categorie || 'Autre';
  }

  categoryBreakdown = computed(() => {
    const counts = new Map<string, number>();
    for (const m of this.members()) {
      const label = this.groupLabel(m.categorie);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    const order = ['U7/U9', 'U11', 'U13', 'FSGT', 'LOISIR'];
    const labels = [
      ...order.filter((l) => counts.has(l)),
      ...[...counts.keys()].filter((l) => !order.includes(l)),
    ];
    return labels.map((label) => ({ label, count: counts.get(label)! }));
  });

  panelOpen = signal(false);
  editingId = signal<string | null>(null);
  editingMember = signal<Member | null>(null);
  saving = signal(false);
  formError = signal('');

  deleteTarget = signal<Member | null>(null);
  deleting = signal(false);

  copiedField = signal<{ id: string; field: 'telephone' | 'email' } | null>(null);
  copiedAllEmails = signal(false);

  displayedEmails = computed(() => [
    ...new Set(
      this.sortedMembers()
        .map((m) => m.email.trim())
        .filter((e) => e.length > 0),
    ),
  ]);

  copyAllEmails(): void {
    const emails = this.displayedEmails();
    if (emails.length === 0) return;
    navigator.clipboard.writeText(emails.join('; ')).then(() => {
      this.copiedAllEmails.set(true);
      setTimeout(() => this.copiedAllEmails.set(false), 1500);
    });
  }

  openNoteId = signal<string | null>(null);
  notePos = signal<{ top: number; left: number } | null>(null);

  toggleNote(id: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.openNoteId() === id) {
      this.openNoteId.set(null);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.notePos.set({ top: rect.bottom + 6, left: rect.left });
    this.openNoteId.set(id);
  }

  @HostListener('document:click')
  @HostListener('window:scroll')
  @HostListener('window:resize')
  closeNote(): void {
    if (this.openNoteId()) this.openNoteId.set(null);
  }

  form = this.fb.group({
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    sexe: ['', Validators.required],
    dateNaissance: [''],
    categorie: ['' as Category, Validators.required],
    email: ['', Validators.email],
    telephone: [''],
    cotisationPayee: [0, [Validators.required, Validators.min(0)]],
    cotisationDue: [DEFAULT_COTISATION_DUE, [Validators.required, Validators.min(0)]],
    FBI: [false],
    notes: [''],
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const category = params.get('category') ?? '';
      this.searchTerm.set(category);
    });
    this.loadMembers();
  }

  loadMembers(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.memberService.list().subscribe({
      next: (res) => {
        this.members.set(res.members);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(
          'Impossible de charger les adhérents. Vérifiez que le serveur est démarré.',
        );
        this.loading.set(false);
      },
    });
  }

  filterByCat(categorie: string): void {
    const value = categorie?.trim() ?? '';
    this.searchTerm.set(value);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: value ? { category: value } : { category: null },
      queryParamsHandling: 'merge',
    });
  }

  customFilter(term: string): void {
    this.searchTerm.set(term);
  }

  toggleSort(key: 'nom' | 'dateNaissance' | 'categorie' | 'email' | 'cotisationDue'): void {
    const current = this.sortState();
    const nextDirection = current.key === key && current.direction === 'asc' ? 'desc' : 'asc';
    this.sortState.set({ key, direction: nextDirection });
  }

  getSortIcon(
    key: 'nom' | 'dateNaissance' | 'categorie' | 'email' | 'cotisationDue',
  ): 'up' | 'down' | 'none' {
    const current = this.sortState();
    if (current.key !== key) return 'none';
    return current.direction === 'asc' ? 'up' : 'down';
  }

  formatDate(isoDate: string): string {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    const age = new Date().getFullYear() - Number(y);
    return y && m && d ? `${d}/${m}/${y} (${age} ans)` : isoDate;
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c.touched);
  }

  openCreatePanel(): void {
    this.editingId.set(null);
    this.editingMember.set(null);
    this.formError.set('');
    this.form.reset(emptyMember());
    this.panelOpen.set(true);
  }

  openMemberPanel(member: Member): void {
    this.editingId.set(member.id);
    this.editingMember.set(member);
    this.formError.set('');
    this.form.reset({
      nom: member.nom,
      prenom: member.prenom,
      sexe: member.sexe,
      dateNaissance: member.dateNaissance,
      categorie: member.categorie,
      email: member.email,
      telephone: member.telephone,
      cotisationPayee: member.cotisationPayee,
      cotisationDue: member.cotisationDue,
      FBI: member.FBI,
      notes: member.notes ?? '',
    });
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  saveMember(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const v = this.form.getRawValue();
    const data: MemberInput = {
      nom: v.nom ?? '',
      prenom: v.prenom ?? '',
      sexe: (v.sexe ?? '') as Member['sexe'],
      dateNaissance: v.dateNaissance ?? '',
      categorie: v.categorie ?? ('' as Category),
      email: v.email ?? '',
      telephone: v.telephone ?? '',
      cotisationPayee: Number(v.cotisationPayee) || 0,
      cotisationDue: Number(v.cotisationDue) || 0,
      FBI: v.FBI ?? false,
      notes: v.notes ?? '',
    };

    const id = this.editingId();
    const req = id ? this.memberService.update(id, data) : this.memberService.create(data);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.panelOpen.set(false);
        this.loadMembers();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.error ?? "Échec de l'enregistrement de l'adhérent.");
      },
    });
  }

  confirmDelete(member: Member): void {
    this.panelOpen.set(false);
    this.deleteTarget.set(member);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  deleteMember(): void {
    const member = this.deleteTarget();
    if (!member) return;
    this.deleting.set(true);
    this.memberService.delete(member.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.loadMembers();
      },
      error: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
      },
    });
  }

  generateInvoice(member: Member): void {
    this.router.navigate(['/factures', member.id]);
  }

  copyField(member: Member, field: 'telephone' | 'email'): void {
    const value = member[field];
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      this.copiedField.set({ id: member.id, field });
      setTimeout(() => {
        if (this.copiedField()?.id === member.id && this.copiedField()?.field === field) {
          this.copiedField.set(null);
        }
      }, 1500);
    });
  }
}
