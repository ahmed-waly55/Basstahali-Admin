import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { adminRows, CreateStaffRequest } from '../models/admin-operations';
import { AdminOperationsService } from './admin-operations';

describe('AdminOperationsService documented API contract', () => {
  let service: AdminOperationsService;
  let http: HttpTestingController;
  const base = `${environment.baseUrl}/api/v1`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminOperationsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads users, attendance and contact messages from their documented GET paths', () => {
    for (const [request, path] of [
      [service.getUsers(), 'users'], [service.getAttendance(), 'attendance'], [service.getContacts(), 'contact-us'],
    ] as const) {
      let rows: unknown;
      request.subscribe(result => { rows = result; });
      const call = http.expectOne(`${base}/${path}`);
      expect(call.request.method).toBe('GET');
      call.flush({ success: true, data: { items: [{ id: 'known-id' }] } });
      expect(rows).toEqual([{ id: 'known-id' }]);
    }
  });

  it('posts the documented staff fields without adding role enums or salary currency', () => {
    const body: CreateStaffRequest = {
      userName: 'staff', password: 'temporary-test-password', displayName: 'عضو الفريق',
      email: 'staff@example.com', phoneNumber: '', role: 'ConfiguredRole',
      contactInformation: '', fixedMonthlySalary: 1200,
    };
    service.createStaff(body).subscribe();
    const call = http.expectOne(`${base}/users/staff`);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(body);
    call.flush({ success: true });
  });

  it('uses POST activation and deactivation paths and encodes the user ID', () => {
    for (const active of [true, false]) {
      service.setUserActive('user/id', active).subscribe();
      const call = http.expectOne(`${base}/users/user%2Fid/${active ? 'activate' : 'deactivate'}`);
      expect(call.request.method).toBe('POST');
      call.flush(null);
    }
  });

  it('sends notes and an idempotency key for both attendance decisions', () => {
    const body = { notes: 'تمت المراجعة', idempotencyKey: 'retry-key' };
    for (const decision of ['confirm', 'reject'] as const) {
      service.decideAttendance('attendance-id', decision, body).subscribe();
      const call = http.expectOne(`${base}/attendance/attendance-id/${decision}`);
      expect(call.request.method).toBe('POST');
      expect(call.request.body).toEqual(body);
      call.flush({ success: true });
    }
  });

  it('patches contact status using the sole documented value New', () => {
    service.setContactStatus('message-id', 'New').subscribe();
    const call = http.expectOne(`${base}/contact-us/message-id/status`);
    expect(call.request.method).toBe('PATCH');
    expect(call.request.body).toEqual({ status: 'New' });
    call.flush(null);
  });

  it('propagates HTTP failures instead of presenting them as empty data', () => {
    let error: unknown;
    service.getUsers().subscribe({ error: result => { error = result; } });
    http.expectOne(`${base}/users`).flush({ message: 'صلاحيات غير كافية' }, { status: 403, statusText: 'Forbidden' });
    expect(error).toMatchObject({ status: 403 });
  });

  it('treats a logical rejection inside HTTP 200 as a failed mutation', () => {
    let error: unknown;
    service.setUserActive('user-id', true).subscribe({ error: result => { error = result; } });
    http.expectOne(`${base}/users/user-id/activate`).flush({ success: false, message: 'تعذر تفعيل الحساب' });
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('تعذر تفعيل الحساب');
  });
});

describe('Admin list response normalization', () => {
  it('accepts a direct array and nested paginated data without changing row values', () => {
    const rows = [{ id: 'one', displayName: 'مستخدم' }];
    expect(adminRows(rows)).toEqual(rows);
    expect(adminRows({ data: { items: rows }, success: true })).toEqual(rows);
  });

  it('rejects unfamiliar objects and logical failures instead of inventing rows', () => {
    expect(() => adminRows({ unfamiliarField: 3 })).toThrow();
    expect(() => adminRows({ isSuccess: false, message: 'فشل الطلب', data: [] })).toThrow('فشل الطلب');
  });
});
