import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { IAuth } from '../models/auth';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  constructor(private _HttpClient: HttpClient) {}

  login(data: IAuth): Observable<any> {
    return this._HttpClient.post(`${environment.baseUrl}/api/v1/admin/auth/login`, data);
  }

  changePassword(data: { currentPassword: string; newPassword: string }): Observable<any> {
    const token = localStorage.getItem('token') || '';

    const headers = new HttpHeaders({
      'token': token
    });

    return this._HttpClient.post(
      `${environment.baseUrl}/api/v1/admin/auth/change-password`,
      data,
      { headers }
    );
  }

  // دالة تجديد الرمز (Refresh Token)
  refreshToken(refreshToken:string): Observable<any> {
    return this._HttpClient.post(
      `${environment.baseUrl}/api/v1/auth/refresh-token`,
      {refreshToken , device : "unkone"}
    );
  }

  // دالة تسجيل الخروج (Logout)
  logoutApi(data: { refreshToken: string; device: string }): Observable<any> {
    return this._HttpClient.post(
      `${environment.baseUrl}/api/v1/auth/logout`,
      data
    );
  }
}
