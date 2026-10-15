import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BatchStudentSchedules, CreateStudentSchedule, scheduleData, UpdateStudentSchedule } from '../models/student-schedules';

@Injectable({ providedIn: 'root' })
export class StudentSchedulesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.baseUrl}/api/v1/student-schedules`;

  private get headers(): HttpHeaders {
    const token = (localStorage.getItem('accessToken') || localStorage.getItem('token') || '').replace(/^Bearer\s+/i, '').trim();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  /** Query parameter names are absent from the provided docs; do not guess them. */
  search(): Observable<unknown> {
    return this.http.get(`${this.url}/search`, { headers: this.headers }).pipe(map(scheduleData));
  }

  forStudent(studentId: string): Observable<unknown> {
    return this.http.get(`${this.url}/students/${encodeURIComponent(studentId)}`, { headers: this.headers }).pipe(map(scheduleData));
  }

  options(studentId: string): Observable<unknown> {
    return this.http.get(`${this.url}/students/${encodeURIComponent(studentId)}/options`, { headers: this.headers }).pipe(map(scheduleData));
  }

  create(body: CreateStudentSchedule): Observable<unknown> {
    return this.http.post(this.url, body, { headers: this.headers }).pipe(map(scheduleData));
  }

  createBatch(body: BatchStudentSchedules): Observable<unknown> {
    return this.http.post(`${this.url}/batch`, body, { headers: this.headers }).pipe(map(scheduleData));
  }

  update(id: string, body: UpdateStudentSchedule): Observable<unknown> {
    return this.http.put(`${this.url}/${encodeURIComponent(id)}`, body, { headers: this.headers }).pipe(map(scheduleData));
  }

  delete(id: string): Observable<unknown> {
    return this.http.delete(`${this.url}/${encodeURIComponent(id)}`, { headers: this.headers }).pipe(map(scheduleData));
  }
}
