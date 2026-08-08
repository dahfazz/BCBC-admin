import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PlanningEventOverride, PlanningEventPayload } from './planning.model';

@Injectable({ providedIn: 'root' })
export class PlanningEventsService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/planning-events`;

  list(): Observable<{ events: PlanningEventOverride[] }> {
    return this.http.get<{ events: PlanningEventOverride[] }>(this.API);
  }

  upsert(id: string, data: PlanningEventPayload): Observable<{ event: PlanningEventOverride }> {
    return this.http.put<{ event: PlanningEventOverride }>(`${this.API}/${id}`, data);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.API}/${id}`);
  }
}
