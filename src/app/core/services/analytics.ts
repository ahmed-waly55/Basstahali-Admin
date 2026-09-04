import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {

  constructor(private http: HttpClient) {}

  /**
   * دالة مساعدة لإنشاء الهيدر وإرفاق التوكن من الـ LocalStorage
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * 1. جلب المعاملات المالية (GET)
   */
  getFinancialTransactions(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${environment.baseUrl}/api/v1/financial-transactions`, { headers });
  }

  /**
   * 2. جلب أرباح الشركاء (GET)
   */
  getPartnerDividends(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${environment.baseUrl}/api/v1/partner-dividends`, { headers });
  }

  /**
   * 3. جلب المصاريف التشغيلية (GET)
   */
  getOperatingExpenses(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${environment.baseUrl}/api/v1/operating-expenses`, { headers });
  }

  /**
   * 4. جلب الفترات المالية (GET)
   */
  getFinancialPeriods(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${environment.baseUrl}/api/v1/financial-periods`, { headers });
  }


  /**
   * 6. جلب مدفوعات الطلاب (GET)
   */
  getStudentPayments(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${environment.baseUrl}/api/v1/student-payments`, { headers });
  }

  /**
   * 7. تحليل الإيرادات (GET)
   */
  getRevenueAnalysis(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${environment.baseUrl}/api/v1/financial-analysis/revenue`, { headers });
  }

  /**
   * 8. تحليل التكاليف (GET)
   */
  getCostsAnalysis(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${environment.baseUrl}/api/v1/financial-analysis/costs`, { headers });
  }

  /**
   * 9. تحليل صافي الربح (GET)
   */
  getNetProfitAnalysis(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${environment.baseUrl}/api/v1/financial-analysis/net-profit`, { headers });
  }

  /**
   * 10. تحليل ربحية الطلاب (GET)
   */
  getStudentProfitabilityAnalysis(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${environment.baseUrl}/api/v1/financial-analysis/student-profitability`, { headers });
  }

  /**
   * 11. تحويل العملات (GET)
   * ملاحظة: إذا كانت هذه الـ Endpoint تحتاج إلى Query Parameters مثل (from, to, amount) يمكنك تمريرها كـ options.params
   */
  convertExchangeRate(params?: any): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${environment.baseUrl}/api/v1/exchange-rates/convert`, { headers, params });
  }
}
