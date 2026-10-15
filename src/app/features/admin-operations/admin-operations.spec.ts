import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminOperationsService } from '../../core/services/admin-operations';
import { AdminOperations } from './admin-operations';

describe('AdminOperations workflows', () => {
  let api: { getUsers: ReturnType<typeof vi.fn>; getAttendance: ReturnType<typeof vi.fn>; decideAttendance: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = { getUsers: vi.fn(() => of([])), getAttendance: vi.fn(() => of([])), decideAttendance: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [AdminOperations], providers: [{ provide: AdminOperationsService, useValue: api }],
    }).compileComponents();
  });

  it('renders an Arabic empty state from a successful empty list', () => {
    const fixture = TestBed.createComponent(AdminOperations);
    fixture.detectChanges();
    expect(api.getUsers).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('لا توجد سجلات حاليًا');
    expect(fixture.nativeElement.querySelector('section').getAttribute('dir')).toBe('rtl');
  });

  it('keeps the attendance idempotency key for an identical retry after an error', () => {
    const fixture = TestBed.createComponent(AdminOperations);
    const page = fixture.componentInstance;
    page.section.set('attendance');
    page.selectedRow.set({ id: 'attendance-id' });
    page.attendanceNotes.setValue('تمت المراجعة');
    api.decideAttendance.mockReturnValue(throwError(() => new Error('خطأ في الاتصال')));
    page.decideAttendance('confirm');
    expect(page.saving()).toBe(false);
    expect(page.error()).toContain('خطأ في الاتصال');
    page.decideAttendance('confirm');
    const firstBody = api.decideAttendance.mock.calls[0][2];
    const retryBody = api.decideAttendance.mock.calls[1][2];
    expect(firstBody.idempotencyKey).toBeTruthy();
    expect(retryBody).toEqual(firstBody);
    expect(firstBody.notes).toBe('تمت المراجعة');
  });

  it('does not submit a decision when the response row has no ID', () => {
    const page = TestBed.createComponent(AdminOperations).componentInstance;
    page.section.set('attendance');
    page.selectedRow.set({ studentName: 'طالب' });
    page.decideAttendance('reject');
    expect(api.decideAttendance).not.toHaveBeenCalled();
  });

  it('retains load errors separately from a successful empty list', () => {
    api.getUsers.mockReturnValue(throwError(() => new Error('فشل التحميل')));
    const fixture = TestBed.createComponent(AdminOperations);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('فشل التحميل');
    expect(fixture.nativeElement.textContent).not.toContain('لا توجد سجلات حاليًا');
  });
});
