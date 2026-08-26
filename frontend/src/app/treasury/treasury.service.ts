import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TreasuryItem, TreasuryItemInput } from './treasury.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TreasuryService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/treasury-items`;

  list(): Observable<{ items: TreasuryItem[] }> {
    return this.http.get<{ items: TreasuryItem[] }>(this.API);
  }

  create(data: TreasuryItemInput): Observable<{ item: TreasuryItem }> {
    return this.http.post<{ item: TreasuryItem }>(this.API, data);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.API}/${id}`);
  }
}
