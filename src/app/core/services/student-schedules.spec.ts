import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { CreateStudentSchedule } from '../models/student-schedules';
import { StudentSchedulesService } from './student-schedules';

describe('StudentSchedulesService', () => {
  let service: StudentSchedulesService;
  let http: HttpTestingController;
  const url = `${environment.baseUrl}/api/v1/student-schedules`;
  const body: CreateStudentSchedule = {
    studentId: 'student-1', teacherId: 'teacher-1', subjectId: 'subject-1',
    scheduledAt: '2026-10-15T08:00:00Z', durationMinutes: 60, classLink: '',
    studentCreditCost: 1, recurrenceType: 'Once', sessionCount: 1,
    dayOfWeek: 'Thursday', startTime: '10:00:00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(StudentSchedulesService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses the documented reads without guessed search parameters', () => {
    service.search().subscribe();
    service.forStudent('student-1').subscribe();
    service.options('student-1').subscribe();
    for (const path of ['/search', '/students/student-1', '/students/student-1/options']) {
      const request = http.expectOne(url + path);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys()).toEqual([]);
      request.flush({ success: true, data: [] });
    }
  });

  it('sends single and batch bodies to their documented endpoints', () => {
    service.create(body).subscribe();
    const single = http.expectOne(url);
    expect(single.request.method).toBe('POST');
    expect(single.request.body).toEqual(body);
    single.flush({ success: true });
    const { studentId, recurrenceEndDate, ...item } = body;
    service.createBatch({ studentId, items: [item] }).subscribe();
    const batch = http.expectOne(`${url}/batch`);
    expect(batch.request.method).toBe('POST');
    expect(batch.request.body.items[0].studentId).toBeUndefined();
    expect(batch.request.body).toEqual({ studentId, items: [item] });
    batch.flush({ success: true });
  });

  it('does not report a rejected update as successful', () => {
    let completedSuccessfully = false;
    let errorMessage = '';
    const { sessionCount, dayOfWeek, startTime, ...update } = body;
    service.update('schedule-1', update).subscribe({ next: () => completedSuccessfully = true, error: error => errorMessage = error.message });
    const request = http.expectOne(`${url}/schedule-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(update);
    request.flush({ success: false, message: 'الموعد غير متاح' });
    expect(completedSuccessfully).toBe(false);
    expect(errorMessage).toBe('الموعد غير متاح');
  });

  it('deletes by the actual schedule ID', () => {
    service.delete('schedule-1').subscribe();
    const request = http.expectOne(`${url}/schedule-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
