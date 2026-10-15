import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateCreditBatch, CreateInstallmentPlan, FinanceRecord,
  RecordInstallmentPayment, RecordStudentPayment,
} from '../models/student-finance';

export function financeData(response: unknown): unknown {
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    const envelope = response as FinanceRecord;
    if (envelope['success'] === false) {
      throw new Error(typeof envelope['message'] === 'string' ? envelope['message'] : 'تعذر إتمام العملية.');
    }
    if ('data' in envelope) return financeData(envelope['data']);
  }
  return response;
}

export function financeList(response: unknown): FinanceRecord[] {
  const data = financeData(response);
  if (data == null) return [];
  if (Array.isArray(data)) return data.filter(isFinanceRecord);
  if (isFinanceRecord(data) && Array.isArray(data['items'])) return data['items'].filter(isFinanceRecord);
  throw new Error('صيغة القائمة المستلمة غير متوقعة. تعذر عرض البيانات بأمان.');
}

export function isFinanceRecord(value: unknown): value is FinanceRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** One key per unchanged operation; retries after failure reuse the original key. */
export class FinanceOperationKey {
  private signature = '';
  private key = '';

  forPayload(payload: unknown): string {
    const signature = JSON.stringify(payload);
    if (!this.key || signature !== this.signature) {
      this.signature = signature;
      this.key = crypto.randomUUID();
    }
    return this.key;
  }

  reset(): void { this.signature = ''; this.key = ''; }
}

@Injectable({ providedIn: 'root' })
export class StudentFinanceService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.baseUrl}/api/v1`;

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private get(path: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/${path}`, { headers: this.headers() }).pipe(map(financeData));
  }

  private post(path: string, body: unknown): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/${path}`, body, { headers: this.headers() }).pipe(map(financeData));
  }

  getSummary(): Observable<unknown> { return this.get('student-finance/summary'); }
  getPayments(studentId?: string): Observable<FinanceRecord[]> {
    return this.get(studentId ? `students/${encodeURIComponent(studentId)}/payments` : 'student-payments').pipe(map(financeList));
  }
  recordPayment(studentId: string, body: RecordStudentPayment): Observable<unknown> {
    return this.post(`students/${encodeURIComponent(studentId)}/payments`, body);
  }
  getCreditBatches(studentId: string): Observable<FinanceRecord[]> {
    return this.get(`students/${encodeURIComponent(studentId)}/credit-batches`).pipe(map(financeList));
  }
  createCreditBatch(studentId: string, body: CreateCreditBatch): Observable<unknown> {
    return this.post(`students/${encodeURIComponent(studentId)}/credit-batches`, body);
  }
  getInstallmentPlans(): Observable<FinanceRecord[]> { return this.get('installment-plans').pipe(map(financeList)); }
  createInstallmentPlan(body: CreateInstallmentPlan): Observable<unknown> { return this.post('installment-plans', body); }
  recordInstallmentPayment(id: string, body: RecordInstallmentPayment): Observable<unknown> {
    return this.post(`installment-plans/installments/${encodeURIComponent(id)}/payments`, body);
  }
  getProviderPayments(): Observable<FinanceRecord[]> { return this.get('payments/fawaterak').pipe(map(financeList)); }
  getProviderPayment(id: string): Observable<unknown> { return this.get(`payments/fawaterak/${encodeURIComponent(id)}`); }
}
