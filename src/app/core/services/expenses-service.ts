import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface OperatingExpenseInput {
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  reference: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExpensesService {
  // قم بتغيير الـ URL الأساسي ليناسب مشروعك

  constructor(private http: HttpClient) {}

  // دالة مساعدة لجلب التوكن وإضافته للهيدر
  private getAuthHeaders(): HttpHeaders {
    const token = (localStorage.getItem('accessToken') || localStorage.getItem('token') || '').replace(/^Bearer\s+/i, '').trim();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // 1. إضافة مصروف تشغيلي جديد
  createOperatingExpense(expenseData: OperatingExpenseInput): Observable<any> {
    return this.http.post<any>(
      `${environment.baseUrl}/api/v1/finance/operating-expenses`,
      expenseData,
      { headers: this.getAuthHeaders() }
    );
  }

  // 2. جلب قائمة المصروفات التشغيلية
  getOperatingExpenses(): Observable<any> {
    return this.http.get<any>(
      `${environment.baseUrl}/api/v1/operating-expenses`,
      { headers: this.getAuthHeaders() }
    );
  }

  getOperatingExpense(id: string): Observable<any> {
    return this.http.get<any>(`${environment.baseUrl}/api/v1/operating-expenses/${encodeURIComponent(id)}`, {
      headers: this.getAuthHeaders()
    });
  }

  updateOperatingExpense(id: string, expense: OperatingExpenseInput): Observable<any> {
    return this.http.put<any>(`${environment.baseUrl}/api/v1/operating-expenses/${encodeURIComponent(id)}`, expense, {
      headers: this.getAuthHeaders()
    });
  }

  deleteOperatingExpense(id: string): Observable<any> {
    return this.http.delete<any>(`${environment.baseUrl}/api/v1/operating-expenses/${encodeURIComponent(id)}`, {
      headers: this.getAuthHeaders()
    });
  }

  // 3. اتخاذ قرار (موافقة / رفض) على مصروف معين
  updateExpenseDecision(id: string, decision: string): Observable<any> {
    return this.http.post<any>(
      `${environment.baseUrl}/api/v1/operating-expenses/${id}/${decision}`,
      {}, // إذا لم يكن هناك Request Body يتم إرسال كائن فارغ
      { headers: this.getAuthHeaders() }
    );
  }

  // 4. جلب تقارير المصروفات
  getExpenseReports(): Observable<any> {
    return this.http.get<any>(
      `${environment.baseUrl}/api/v1/reports/expenses`,
      { headers: this.getAuthHeaders() }
    );
  }
}
