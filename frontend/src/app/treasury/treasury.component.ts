import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar.component';
import { MemberService } from '../members/member.service';
import { Member } from '../members/member.model';
import { TreasuryService } from './treasury.service';

@Component({
  selector: 'app-treasury',
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './treasury.component.html',
  styleUrl: './treasury.component.scss',
})
export class TreasuryComponent implements OnInit {
  private memberService = inject(MemberService);
  private treasuryService = inject(TreasuryService);

  members = signal<Member[]>([]);
  loading = signal(false);
  loadError = signal('');

  cotisationSummary = computed(() => {
    const list = this.members();
    const totalPaid = list.reduce((sum, m) => sum + (Number(m.cotisationPayee) || 0), 0);
    const totalDue = list.reduce((sum, m) => sum + (Number(m.cotisationDue) || 0), 0);
    return { totalPaid, totalDue, total: totalPaid + totalDue };
  });

  private groupLabel(categorie: string): string {
    return categorie === 'U7' || categorie === 'U9' ? 'U7/U9' : categorie || 'Autre';
  }

  categoryBreakdown = computed(() => {
    const groups = new Map<string, { count: number; paid: number; due: number }>();
    for (const m of this.members()) {
      const label = this.groupLabel(m.categorie);
      const g = groups.get(label) ?? { count: 0, paid: 0, due: 0 };
      g.count += 1;
      g.paid += Number(m.cotisationPayee) || 0;
      g.due += Number(m.cotisationDue) || 0;
      groups.set(label, g);
    }
    const order = ['U7/U9', 'U11', 'U13', 'FSGT', 'LOISIR'];
    const labels = [
      ...order.filter((l) => groups.has(l)),
      ...[...groups.keys()].filter((l) => !order.includes(l)),
    ];
    return labels.map((label) => ({ label, ...groups.get(label)! }));
  });

  depenses = this.treasuryService.depenses;
  recettes = this.treasuryService.recettes;

  totalDepenses = computed(() => this.depenses().reduce((sum, i) => sum + i.amount, 0));
  totalRecettesManuelles = computed(() => this.recettes().reduce((sum, i) => sum + i.amount, 0));
  totalRecettes = computed(() => this.cotisationSummary().total + this.totalRecettesManuelles());
  solde = computed(() => this.totalRecettes() - this.totalDepenses());

  newDepenseLabel = '';
  newDepenseAmount: number | null = null;
  newDepenseDate = '';

  newRecetteLabel = '';
  newRecetteAmount: number | null = null;
  newRecetteDate = '';

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

  addDepense(): void {
    if (!this.newDepenseLabel.trim() || !this.newDepenseAmount) return;
    this.treasuryService.addDepense(this.newDepenseLabel.trim(), this.newDepenseAmount, this.newDepenseDate || undefined);
    this.newDepenseLabel = '';
    this.newDepenseAmount = null;
    this.newDepenseDate = '';
  }

  removeDepense(id: string): void {
    this.treasuryService.removeDepense(id);
  }

  addRecette(): void {
    if (!this.newRecetteLabel.trim() || !this.newRecetteAmount) return;
    this.treasuryService.addRecette(this.newRecetteLabel.trim(), this.newRecetteAmount, this.newRecetteDate || undefined);
    this.newRecetteLabel = '';
    this.newRecetteAmount = null;
    this.newRecetteDate = '';
  }

  removeRecette(id: string): void {
    this.treasuryService.removeRecette(id);
  }
}
