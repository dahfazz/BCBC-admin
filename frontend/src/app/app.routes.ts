import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'adherents', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'adherents',
    canActivate: [authGuard],
    loadComponent: () => import('./members/members-list.component').then(m => m.MembersListComponent),
  },
  {
    path: 'planning',
    canActivate: [authGuard],
    loadComponent: () => import('./planning/planning.component').then(m => m.PlanningComponent),
  },
  {
    path: 'tresorerie',
    canActivate: [authGuard],
    loadComponent: () => import('./treasury/treasury.component').then(m => m.TreasuryComponent),
  },
  {
    path: 'factures',
    canActivate: [authGuard],
    loadComponent: () => import('./invoice/invoice-form.component').then(m => m.InvoiceFormComponent),
  },
  {
    path: 'factures/:memberId',
    canActivate: [authGuard],
    loadComponent: () => import('./invoice/invoice-form.component').then(m => m.InvoiceFormComponent),
  },
  { path: '**', redirectTo: 'adherents' },
];
