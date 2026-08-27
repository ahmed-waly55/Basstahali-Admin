import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { IAuth } from '../models/auth';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  constructor(private _HttpClient:HttpClient){}
login(data:IAuth):Observable<any>{
  return this._HttpClient.post(`${environment.baseUrl}/api/v1/admin/auth/login`, data)
}
}


