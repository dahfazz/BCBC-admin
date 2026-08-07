import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'adherents', pathMatch: 'full' },
  {
    path: 'adherents',
    loadComponent: () => import('./members/members-list.component').then(m => m.MembersListComponent),
  },
  {
    path: 'planning',
    loadComponent: () => import('./planning/planning.component').then(m => m.PlanningComponent),
  },
  {
    path: 'tresorerie',
    loadComponent: () => import('./treasury/treasury.component').then(m => m.TreasuryComponent),
  },
  {
    path: 'factures',
    loadComponent: () => import('./invoice/invoice-form.component').then(m => m.InvoiceFormComponent),
  },
  {
    path: 'factures/:memberId',
    loadComponent: () => import('./invoice/invoice-form.component').then(m => m.InvoiceFormComponent),
  },
  { path: '**', redirectTo: 'adherents' },
];
