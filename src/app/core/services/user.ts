import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateStudentPayload, UpdateStudentPayload, CreditAdjustmentPayload } from '../models/student';

@Injectable({
  providedIn: 'root',
})
export class User {
  constructor(private _HttpClient: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  addStudents(body: CreateStudentPayload): Observable<any> {
    const headers = this.getHeaders();
    return this._HttpClient.post(`${environment.baseUrl}/api/v1/students`, body, { headers });
  }

  getStudents(): Observable<any> {
    const headers = this.getHeaders();
    return this._HttpClient.get(`${environment.baseUrl}/api/v1/students`, { headers });
  }

  getStudentById(id: string): Observable<any> {
    return this._HttpClient.get(`${environment.baseUrl}/api/v1/students/${encodeURIComponent(id)}`, { headers: this.getHeaders() });
  }

  updateStudent(id: string, body: UpdateStudentPayload): Observable<any> {
    return this._HttpClient.put(`${environment.baseUrl}/api/v1/students/${encodeURIComponent(id)}`, body, { headers: this.getHeaders() });
  }

  deleteStudent(id: string): Observable<any> {
    return this._HttpClient.delete(`${environment.baseUrl}/api/v1/students/${encodeURIComponent(id)}`, { headers: this.getHeaders() });
  }

  getArchivedStudents(): Observable<any> {
    return this._HttpClient.get(`${environment.baseUrl}/api/v1/archived-records/students`, { headers: this.getHeaders() });
  }

  restoreStudent(id: string): Observable<any> {
    return this._HttpClient.post(`${environment.baseUrl}/api/v1/students/${encodeURIComponent(id)}/restore`, {}, { headers: this.getHeaders() });
  }

  adjustStudentCredits(id: string, body: CreditAdjustmentPayload): Observable<any> {
    return this._HttpClient.post(`${environment.baseUrl}/api/v1/students/${encodeURIComponent(id)}/credits/adjust`, body, { headers: this.getHeaders() });
  }

  useSessionSubscription(id: string): Observable<any> {
    return this._HttpClient.patch(`${environment.baseUrl}/api/v1/students/${encodeURIComponent(id)}/subscription-mode`, { mode: 'Sessions' }, { headers: this.getHeaders() });
  }


// teacher-forms

  getTeacherForms(): Observable<any> {
    const headers = this.getHeaders();
    return this._HttpClient.get(`${environment.baseUrl}/api/v1/teacher-forms`, { headers });
  }


  approveTeacherForm(requestId: string): Observable<any> {
    const headers = this.getHeaders();
    return this._HttpClient.post(`${environment.baseUrl}/api/v1/teacher-forms/${requestId}/approve`, {}, { headers });
  }

  rejectTeacherForm(requestId: string, reason: string): Observable<any> {
    const headers = this.getHeaders();
    const body = { reason };
    return this._HttpClient.post(`${environment.baseUrl}/api/v1/teacher-forms/${requestId}/reject`, body, { headers });
  }

}
