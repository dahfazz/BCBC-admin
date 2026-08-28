import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageNavComponent } from '../shared/page-nav.component';
import { MemberService } from '../members/member.service';
import { Member } from '../members/member.model';
import { TreasuryService } from './treasury.service';
import { TreasuryItem } from './treasury.model';

@Component({
  selector: 'app-treasury',
  imports: [CommonModule, FormsModule, PageNavComponent],
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

  depenses = signal<TreasuryItem[]>([]);
  recettes = signal<TreasuryItem[]>([]);

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
    this.loadTreasuryItems();
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

  loadTreasuryItems(): void {
    this.treasuryService.list().subscribe({
      next: (res) => {
        this.depenses.set(res.items.filter((i) => i.type === 'depense'));
        this.recettes.set(res.items.filter((i) => i.type === 'recette'));
      },
      error: () => {
        this.loadError.set(
          'Impossible de charger les opérations de trésorerie. Vérifiez que le serveur est démarré.',
        );
      },
    });
  }

  addDepense(): void {
    if (!this.newDepenseLabel.trim() || !this.newDepenseAmount) return;
    this.treasuryService
      .create({
        type: 'depense',
        label: this.newDepenseLabel.trim(),
        amount: this.newDepenseAmount,
        date: this.newDepenseDate || undefined,
      })
      .subscribe({
        next: (res) => {
          this.depenses.update((list) => [...list, res.item]);
          this.newDepenseLabel = '';
          this.newDepenseAmount = null;
          this.newDepenseDate = '';
        },
        error: () => this.loadError.set("Impossible d'ajouter la dépense."),
      });
  }

  removeDepense(id: string): void {
    this.treasuryService.delete(id).subscribe({
      next: () => this.depenses.update((list) => list.filter((i) => i.id !== id)),
      error: () => this.loadError.set('Impossible de supprimer la dépense.'),
    });
  }

  addRecette(): void {
    if (!this.newRecetteLabel.trim() || !this.newRecetteAmount) return;
    this.treasuryService
      .create({
        type: 'recette',
        label: this.newRecetteLabel.trim(),
        amount: this.newRecetteAmount,
        date: this.newRecetteDate || undefined,
      })
      .subscribe({
        next: (res) => {
          this.recettes.update((list) => [...list, res.item]);
          this.newRecetteLabel = '';
          this.newRecetteAmount = null;
          this.newRecetteDate = '';
        },
        error: () => this.loadError.set("Impossible d'ajouter la recette."),
      });
  }

  removeRecette(id: string): void {
    this.treasuryService.delete(id).subscribe({
      next: () => this.recettes.update((list) => list.filter((i) => i.id !== id)),
      error: () => this.loadError.set('Impossible de supprimer la recette.'),
    });
  }
}
