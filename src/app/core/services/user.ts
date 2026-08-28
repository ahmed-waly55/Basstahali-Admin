import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

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

  addStudents(body: any): Observable<any> {
    const headers = this.getHeaders();
    return this._HttpClient.post(`${environment.baseUrl}/api/v1/students`, body, { headers });
  }

  getStudents(): Observable<any> {
    const headers = this.getHeaders();
    return this._HttpClient.get(`${environment.baseUrl}/api/v1/students`, { headers });
  }
}
