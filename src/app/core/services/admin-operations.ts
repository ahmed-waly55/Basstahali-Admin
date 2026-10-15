import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminRow, adminRows, assertAdminSuccess, AttendanceDecision, AttendanceDecisionRequest,
  ContactStatus, CreateStaffRequest,
} from '../models/admin-operations';

@Injectable({ providedIn: 'root' })
export class AdminOperationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/v1`;

  getUsers(): Observable<AdminRow[]> {
    return this.http.get<unknown>(`${this.baseUrl}/users`).pipe(map(adminRows));
  }

  createStaff(body: CreateStaffRequest): Observable<unknown> {
    return this.check(this.http.post<unknown>(`${this.baseUrl}/users/staff`, body));
  }

  setUserActive(id: string, active: boolean): Observable<unknown> {
    return this.check(this.http.post<unknown>(`${this.baseUrl}/users/${encodeURIComponent(id)}/${active ? 'activate' : 'deactivate'}`, {}));
  }

  getAttendance(): Observable<AdminRow[]> {
    return this.http.get<unknown>(`${this.baseUrl}/attendance`).pipe(map(adminRows));
  }

  decideAttendance(id: string, decision: AttendanceDecision, body: AttendanceDecisionRequest): Observable<unknown> {
    return this.check(this.http.post<unknown>(`${this.baseUrl}/attendance/${encodeURIComponent(id)}/${decision}`, body));
  }

  getContacts(): Observable<AdminRow[]> {
    return this.http.get<unknown>(`${this.baseUrl}/contact-us`).pipe(map(adminRows));
  }

  setContactStatus(id: string, status: ContactStatus): Observable<unknown> {
    return this.check(this.http.patch<unknown>(`${this.baseUrl}/contact-us/${encodeURIComponent(id)}/status`, { status }));
  }

  private check(request: Observable<unknown>): Observable<unknown> {
    // An API rejection can be returned inside a successful HTTP response.
    return request.pipe(map(response => {
      assertAdminSuccess(response);
      return response;
    }));
  }
}
