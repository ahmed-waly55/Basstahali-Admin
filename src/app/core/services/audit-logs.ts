import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class AuditLogs {
  private _HttpClient = inject(HttpClient);

  // دالة مساعدة لإنشاء الهيدر وإرسال التوكن المخزن
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

  /**
   * فحص جاهزية وحالة الخادم (Health Check / Liveness)
   */
  getHealthLive(): Observable<any> {
    return this._HttpClient.get(
      `${environment.baseUrl}/health/live`,
      {
        headers: this.getHeaders(),
        // لضمان عدم حدوث خطأ إذا كانت الاستجابة نصاً عادياً مثل Healthy
        responseType: 'text' as 'json'
      }
    );
  }
}
