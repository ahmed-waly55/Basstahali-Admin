import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class AuditLogs {
  private _HttpClient = inject(HttpClient);

  // دالة مساعدة لإنشاء الهيدر وإرسال التتوكن المخزن
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getAuditLogs(): Observable<any> {
    return this._HttpClient.get(
      `${environment.baseUrl}/api/v1/audit-logs`,
      { headers: this.getHeaders() }
    );
  }

  getAcademicOperationsLogs(): Observable<any> {
    return this._HttpClient.get(
      `${environment.baseUrl}/api/v1/audit-logs/academic-operations`,
      { headers: this.getHeaders() }
    );
  }
}
