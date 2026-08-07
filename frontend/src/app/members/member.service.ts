import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Member, MemberInput } from './member.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private http = inject(HttpClient);
  private readonly BASE = environment.apiUrl;
  private readonly API = `${this.BASE}/api/members`;

  list(): Observable<{ members: Member[] }> {
    return this.http.get<{ members: Member[] }>(this.API);
  }

  create(data: MemberInput): Observable<{ member: Member }> {
    return this.http.post<{ member: Member }>(this.API, data);
  }

  update(id: string, data: MemberInput): Observable<{ member: Member }> {
    return this.http.put<{ member: Member }>(`${this.API}/${id}`, data);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.API}/${id}`);
  }
}
