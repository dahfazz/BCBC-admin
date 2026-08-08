import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MemberService } from './member.service';
import { Member, MemberInput, CATEGORIES, emptyMember } from './member.model';
import { SidebarComponent } from '../shared/sidebar.component';

@Component({
  selector: 'app-members-list',
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './members-list.component.html',
  styleUrl: './members-list.component.scss',
})
export class MembersListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private memberService = inject(MemberService);
  private router = inject(Router);

  readonly categories = CATEGORIES;

  members = signal<Member[]>([]);
  loading = signal(false);
  loadError = signal('');

  searchTerm = signal('');
  filteredMembers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.members();
    if (!term) return list;
    return list
      .sort((a: Member, b: Member) => a.nom.localeCompare(b.nom))
      .filter((m) =>
        `${m.nom} ${m.prenom} ${m.email} ${m.categorie} ${m.numeroLicenceFFBB}`
          .toLowerCase()
          .includes(term),
      );
  });

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

  modalOpen = signal(false);
  editingId = signal<string | null>(null);
  editingMember = signal<Member | null>(null);
  saving = signal(false);
  formError = signal('');

  deleteTarget = signal<Member | null>(null);
  deleting = signal(false);

  form = this.fb.group({
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    sexe: ['', Validators.required],
    dateNaissance: ['', Validators.required],
    categorie: ['', Validators.required],
    email: ['', Validators.email],
    telephone: [''],
    cotisationPayee: [0, [Validators.required, Validators.min(0)]],
    cotisationDue: [0, [Validators.required, Validators.min(0)]],
    numeroLicenceFFBB: [''],
  });

  ngOnInit(): void {
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
    this.searchTerm.set(categorie);
  }

  formatDate(isoDate: string): string {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return y && m && d ? `${d}/${m}/${y}` : isoDate;
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c.touched);
  }

  openCreateModal(): void {
    this.editingId.set(null);
    this.editingMember.set(null);
    this.formError.set('');
    this.form.reset(emptyMember());
    this.modalOpen.set(true);
  }

  openEditModal(member: Member): void {
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
      numeroLicenceFFBB: member.numeroLicenceFFBB,
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
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
      categorie: v.categorie ?? '',
      email: v.email ?? '',
      telephone: v.telephone ?? '',
      cotisationPayee: Number(v.cotisationPayee) || 0,
      cotisationDue: Number(v.cotisationDue) || 0,
      numeroLicenceFFBB: v.numeroLicenceFFBB ?? '',
    };

    const id = this.editingId();
    const req = id ? this.memberService.update(id, data) : this.memberService.create(data);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.loadMembers();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.error ?? "Échec de l'enregistrement de l'adhérent.");
      },
    });
  }

  confirmDelete(member: Member): void {
    this.modalOpen.set(false);
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
}
