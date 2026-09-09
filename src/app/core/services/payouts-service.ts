import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class PayoutsService {
  // قم بتغيير الـ URL الأساسي ليناسب مشروعك

  constructor(private http: HttpClient) {}

  // دالة مساعدة لجلب التوكن وإضافته للهيدر من الـ LocalStorage
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || ''; // تأكد من مطابقة مفتاح التوكن لدك
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // 1. إنشاء فترة صرف مستحقات جديدة (POST)
  createPayoutPeriod(periodData: { startDate: string; endDate: string }): Observable<any> {
    return this.http.post<any>(
      `${environment.baseUrl}/api/v1/finance/payout-periods`,
      periodData,
      { headers: this.getAuthHeaders() }
    );
  }

  // 2. توليد مستحقات لفترة صرف معينة باستخدام الـ ID (POST)
  generatePayoutPeriod(id: string): Observable<any> {
    return this.http.post<any>(
      `${environment.baseUrl}/api/v1/finance/payout-periods/${id}/generate`,
      {}, // إذا لم يكن هناك Body يُرسل كائن فارغ
      { headers: this.getAuthHeaders() }
    );
  }

  // 3. تنفيذ إجراء معين (مثل اعتماد أو إغلاق) على مستحقات الصرف (POST)
  updatePayoutAction(id: string, action: string): Observable<any> {
    return this.http.post<any>(
      `${environment.baseUrl}/api/v1/finance/payouts/${id}/${action}`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // 4. جلب قائمة مستحقات المعلمين (GET)
  getTeacherPayouts(): Observable<any> {
    return this.http.get<any>(
      `${environment.baseUrl}/api/v1/admin/teachers/financial-summary`,
      { headers: this.getAuthHeaders() }
    );
  }

  // 5. إنشاء طلب تعديل على مستحقات المعلم (POST)
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

  decidePayoutAdjustment(
    id: string,
    decisionData: { status: string; approvedAmount: number; adminResponse: string }
  ): Observable<any> {
    return this.http.post<any>(
      `${environment.baseUrl}/api/v1/payout-adjustments/${id}/decision`,
      decisionData,
      { headers: this.getAuthHeaders() }
    );
  }

  updateTeacherPayoutAction(id: string, action: string): Observable<any> {
    return this.http.post<any>(
      `${environment.baseUrl}/api/v1/teacher-payouts/${id}/${action}`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  rejectTeacherPayout(id: string, reason: string): Observable<any> {
    return this.http.post<any>(
      `${environment.baseUrl}/api/v1/teacher-payouts/${id}/reject`,
      { reason: reason },
      { headers: this.getAuthHeaders() }
    );
  }

  // ==========================================
  // 🚀 الـ APIs الجديدة (Payroll)
  // ==========================================

  // 1. تعديل راتب/مستحقات المعلم (PUT)
  updateTeacherPayroll(teacherId: string, payrollData: {
    from: string;
    to: string;
    sessionCount: number;
    sessionRate: number;
    bonus: number;
    bonusReason: string;
    deduction: number;
    deductionReason: string;
    notes: string;
  }): Observable<any> {
    return this.http.put<any>(
      `${environment.baseUrl}/api/v1/payroll/teachers/${teacherId}`,
      payrollData,
      { headers: this.getAuthHeaders() }
    );
  }

  // 2. اعتماد راتب/مستحقات المعلم (POST)
  approveTeacherPayroll(teacherId: string, approvalData: {
    from: string;
    to: string;
    finalAmount: number;
    notes: string;
  }): Observable<any> {
    return this.http.post<any>(
      `${environment.baseUrl}/api/v1/payroll/teachers/${teacherId}/approve`,
      approvalData,
      { headers: this.getAuthHeaders() }
    );
  }
}
