import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { parseScheduleOverview, ScheduleOverview } from '../models/schedule-overview';

@Injectable({ providedIn: 'root' })
export class ScheduleOverviewService {
  private http = inject(HttpClient);
  getSchedule(): Observable<ScheduleOverview> {
    const token = (localStorage.getItem('accessToken') || localStorage.getItem('token') || '').replace(/^Bearer\s+/i, '').trim();
    return this.http.get<unknown>(`${environment.baseUrl}/api/v1/home/schedule`, {
      headers: token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders(),
    }).pipe(map(parseScheduleOverview));
  }
}
