import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

export interface FinancialPeriodInput { startDate: string; endDate: string; }
export interface PartnerShareInput { partnerId: string; percentage: number; effectiveFrom: string; effectiveTo: string; }
export interface TeacherPayrollInput {
  from: string; to: string; sessionCount: number; sessionRate: number; bonus: number;
  bonusReason: string; deduction: number; deductionReason: string; notes: string;
}
export interface PayrollApprovalInput { from: string; to: string; finalAmount: number; notes: string; }
export interface PayrollAdjustmentInput { type: 'Bonus'; amount: number; reason: string; effectiveDate: string; }

@Injectable({ providedIn: 'root' })
export class FinanceManagementService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.baseUrl}/api/v1`;
  private closeKeys = new Map<string, string>();

  private headers(): HttpHeaders {
    const token = (localStorage.getItem('accessToken') || localStorage.getItem('token') || '').replace(/^Bearer\s+/i, '').trim();
    return new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });
  }

  getFinancialPeriods() { return this.http.get<any>(`${this.baseUrl}/financial-periods`, { headers: this.headers() }); }
  createFinancialPeriod(body: FinancialPeriodInput) { return this.http.post<any>(`${this.baseUrl}/finance/periods`, body, { headers: this.headers() }); }

  // One closing operation per period. Keep its key after network errors and page reloads.
  closeFinancialPeriod(id: string) {
    const storageKey = `basstahali:close-financial-period:${id}`;
    let key = this.closeKeys.get(id);
    if (!key) {
      try { key = sessionStorage.getItem(storageKey) || undefined; } catch { /* Storage can be unavailable in private browsing. */ }
      key ||= crypto.randomUUID();
      this.closeKeys.set(id, key);
      try { sessionStorage.setItem(storageKey, key); } catch { /* The in-memory key still survives retries. */ }
    }
    return this.http.post<any>(`${this.baseUrl}/finance/periods/${encodeURIComponent(id)}/close`, {}, {
      headers: this.headers().set('Idempotency-Key', key)
    });
  }

  getPartners() { return this.http.get<any>(`${this.baseUrl}/partners`, { headers: this.headers() }); }
  createPartnerShare(body: PartnerShareInput) { return this.http.post<any>(`${this.baseUrl}/finance/partner-shares`, body, { headers: this.headers() }); }
  getTeacherPayroll() { return this.http.get<any>(`${this.baseUrl}/payroll/teachers`, { headers: this.headers() }); }
  updateTeacherPayroll(id: string, body: TeacherPayrollInput) {
    return this.http.put<any>(`${this.baseUrl}/payroll/teachers/${encodeURIComponent(id)}`, body, { headers: this.headers() });
  }
  approveTeacherPayroll(id: string, body: PayrollApprovalInput) {
    return this.http.post<any>(`${this.baseUrl}/payroll/teachers/${encodeURIComponent(id)}/approve`, body, { headers: this.headers() });
  }
  getModeratorPayroll() { return this.http.get<any>(`${this.baseUrl}/payroll/moderators`, { headers: this.headers() }); }
  createPayrollAdjustment(targetType: string, targetId: string, body: PayrollAdjustmentInput) {
    return this.http.post<any>(`${this.baseUrl}/payroll/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}/adjustments`, body, { headers: this.headers() });
  }
}
