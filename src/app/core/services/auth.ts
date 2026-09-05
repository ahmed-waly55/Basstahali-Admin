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
    // استبدل 'token' باسم المفتاح الفعلي المخزن عندك في الـ LocalStorage
    const token = localStorage.getItem('token') || '';

    const headers = new HttpHeaders({
      'token': token // تأكد أيضاً إذا كان الـ Backend يطلبها 'token' أو 'Authorization'
    });

    return this._HttpClient.post(
      `${environment.baseUrl}/api/v1/auth/change-password`,
      data,
      { headers }
    );
  }
}
