import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class Notifications {

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getNotifications(): Observable<any> {
    return this.http.get<any>(
      `${environment.baseUrl}/api/v1/notifications`,
      { headers: this.getAuthHeaders() }
    );
  }

  markAsRead(id: string): Observable<any> {
    return this.http.patch<any>(
      `${environment.baseUrl}/api/v1/notifications/${id}/read`,
      {}, // إذا لم يكن هناك Body يُرسل كائن فارغ
      { headers: this.getAuthHeaders() }
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.patch<any>(
      `${environment.baseUrl}/api/v1/notifications/read-all`,
      {}, // لا توجد معاملات مطلوبة
      { headers: this.getAuthHeaders() }
    );
  }
}
