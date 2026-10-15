import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { User } from '../../../../core/services/user';
import { environment } from '../../../../../environments/environment';

// Verify real HTTP verbs/paths/payloads; no live mutations are sent.
describe('Student admin API contract', () => {
  let service: User;
  let http: HttpTestingController;
  const base = `${environment.baseUrl}/api/v1`;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(User);
    http = TestBed.inject(HttpTestingController);
    localStorage.setItem('token', 'test-token');
  });
  afterEach(() => { http.verify(); localStorage.clear(); });

  it('loads student details and archived records from their documented endpoints', () => {
    service.getStudentById('student-1').subscribe();
    const details = http.expectOne(`${base}/students/student-1`);
    expect(details.request.method).toBe('GET');
    expect(details.request.headers.get('Authorization')).toBe('Bearer test-token');
    details.flush({ success: true, data: { id: 'student-1' } });
    service.getArchivedStudents().subscribe();
    http.expectOne(`${base}/archived-records/students`).flush({ data: [] });
  });

  it('updates profile using PUT without account credentials', () => {
    const payload = { fullName: 'طالب', phoneNumber: '0100', parentName: 'ولي', parentPhoneNumber: '0110', gradeLevelId: 'grade', curriculumId: 'curriculum', educationStageId: 'stage', subjectIds: ['subject'], teacherAssignments: [{ subjectId: 'subject', teacherId: 'teacher', sessionPrice: 30, currency: 'EGP' }], expirationDate: '2027-01-01T00:00:00.000Z', status: 'Active' };
    service.updateStudent('student-1', payload).subscribe();
    const request = http.expectOne(`${base}/students/student-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    expect(request.request.body.userName).toBeUndefined();
    expect(request.request.body.password).toBeUndefined();
    request.flush({ success: true });
  });

  it('archives using DELETE and restores using POST', () => {
    service.deleteStudent('student-1').subscribe();
    const archive = http.expectOne(`${base}/students/student-1`);
    expect(archive.request.method).toBe('DELETE'); archive.flush({ success: true });
    service.restoreStudent('student-1').subscribe();
    const restore = http.expectOne(`${base}/students/student-1/restore`);
    expect(restore.request.method).toBe('POST'); expect(restore.request.body).toEqual({});
    restore.flush({ success: true });
  });

  it('retains the supplied credit idempotency key and uses the documented subscription mode', () => {
    const payload = { quantity: 2, description: 'حصة تعويضية', idempotencyKey: 'credit-operation-1' };
    service.adjustStudentCredits('student-1', payload).subscribe();
    const credits = http.expectOne(`${base}/students/student-1/credits/adjust`);
    expect(credits.request.method).toBe('POST'); expect(credits.request.body).toEqual(payload);
    credits.flush({ success: true });
    service.useSessionSubscription('student-1').subscribe();
    const mode = http.expectOne(`${base}/students/student-1/subscription-mode`);
    expect(mode.request.method).toBe('PATCH'); expect(mode.request.body).toEqual({ mode: 'Sessions' });
    mode.flush({ success: true });
  });
});
