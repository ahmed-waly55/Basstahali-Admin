import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export type PayoutAction = 'Submit' | 'Approve' | 'Reject' | 'Pay';

export interface PayoutFilter {
  teacherId?: string;
  periodId?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PayoutsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.baseUrl}/api/v1/teacher-payouts`;

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // 1. شرح دورة الرواتب والـ Actions المتاحة
  // GET /api/v1/teacher-payouts/workflow
  getWorkflow(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/workflow`, {
      headers: this.getAuthHeaders()
    });
  }

  // 2. إنشاء فترة رواتب جديدة
  // POST /api/v1/teacher-payouts/periods
  createPayoutPeriod(periodData: { startDate: string; endDate: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/periods`, periodData, {
      headers: this.getAuthHeaders()
    });
  }

  // 3. عرض فترات الرواتب
  // GET /api/v1/teacher-payouts/periods
  getPayoutPeriods(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/periods`, {
      headers: this.getAuthHeaders()
    });
  }

  // 4. توليد مستحقات المدرسين من الحصص لفترة معينة
  // POST /api/v1/teacher-payouts/periods/{periodId}/generate
  generatePeriodPayouts(periodId: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/periods/${periodId}/generate`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // 5. عرض كشوف الرواتب الرسمية مع دعم الفلاتر
  // GET /api/v1/teacher-payouts?teacherId=&periodId=&status=
  getTeacherPayouts(filters?: PayoutFilter): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      if (filters.teacherId) params = params.set('teacherId', filters.teacherId);
      if (filters.periodId) params = params.set('periodId', filters.periodId);
      if (filters.status) params = params.set('status', filters.status);
    }

    return this.http.get<any>(this.baseUrl, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  // 6. جلب الملخص المالي العام لجميع المعلمين
  // GET /api/v1/admin/teachers/financial-summary
  getFinancialSummary(): Observable<any> {
    return this.http.get<any>(
      `${environment.baseUrl}/api/v1/admin/teachers/financial-summary`,
      { headers: this.getAuthHeaders() }
    );
  }

  // 7. عرض كشف محدد برقم الـ ID
  // GET /api/v1/teacher-payouts/{id}
  getTeacherPayoutById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // 8. تغيير حالة كشف الراتب (Submit, Approve, Pay)
  // POST /api/v1/teacher-payouts/{id}/{action}
  executePayoutAction(id: string, action: PayoutAction, body: any = {}): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${id}/${action}`,
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  // 9. رفض كشف الراتب مع سبب الرفض
  // POST /api/v1/teacher-payouts/{id}/Reject
  rejectTeacherPayout(id: string, reason: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${id}/Reject`,
      { reason },
      { headers: this.getAuthHeaders() }
    );
  }

  // 10. طلبات التعديل المالي الإضافية
  createPayoutAdjustment(adjustmentData: {
    teacherPayoutId: string;
    type: string;
    requestedAmount: number;
    reason: string;
  }): Observable<any> {
    return this.http.post<any>(
      `${environment.baseUrl}/api/v1/payout-adjustments`,
      adjustmentData,
      { headers: this.getAuthHeaders() }
    );
  }
}
