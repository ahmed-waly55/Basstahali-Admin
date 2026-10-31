import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { ModeratorRecord } from '../../../../core/models/account';
import { Account } from '../../../../core/services/account';
import { Moderator } from './moderator';

const moderator: ModeratorRecord = {
  id: 'moderator-1', userName: 'supervisor', fullName: 'أحمد علي',
  phoneNumber: '01012345678', status: 'Active', fixedMonthlySalary: 2500, salaryCurrency: 'EGP',
};

describe('Moderator admin integration', () => {
  let component: Moderator;
  let account: {
    getModerators: ReturnType<typeof vi.fn>;
    createModerator: ReturnType<typeof vi.fn>;
    updateModerator: ReturnType<typeof vi.fn>;
    deleteModerator: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    account = {
      getModerators: vi.fn().mockReturnValue(of({ success: true, data: [moderator] })),
      createModerator: vi.fn().mockReturnValue(of({ success: true })),
      updateModerator: vi.fn().mockReturnValue(of({ success: true })),
      deleteModerator: vi.fn().mockReturnValue(of({ success: true })),
    };
    TestBed.configureTestingModule({ imports: [Moderator], providers: [{ provide: Account, useValue: account }] });
    await TestBed.compileComponents();
    component = TestBed.createComponent(Moderator).componentInstance;
    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: false, isDenied: false, isDismissed: true });
  });

  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('renders the documented salary and status fields and omits credentials from editing', async () => {
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(Moderator);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[title="تعديل"]').click();
    await fixture.whenStable();
    const editDialog = fixture.nativeElement.querySelector('[aria-labelledby="edit-moderator-title"]');
    expect(editDialog.querySelector('[formControlName="status"]')).toBeTruthy();
    expect(editDialog.querySelector('[formControlName="fixedMonthlySalary"]')).toBeTruthy();
    expect(editDialog.querySelector('[formControlName="salaryCurrency"]')).toBeTruthy();
    expect(editDialog.querySelector('[formControlName="userName"]')).toBeNull();
    expect(editDialog.querySelector('[formControlName="password"]')).toBeNull();
  });

  it('sends profile, status and salary to PUT, never to create', () => {
    component.openEditModal(moderator);
    component.editForm.patchValue({ fullName: 'أحمد محمد', fixedMonthlySalary: 3000 });
    component.submitEdit();
    expect(account.updateModerator).toHaveBeenCalledWith('moderator-1', {
      fullName: 'أحمد محمد', phoneNumber: moderator.phoneNumber, status: 'Active',
      fixedMonthlySalary: 3000, salaryCurrency: 'EGP',
    });
    expect(account.createModerator).not.toHaveBeenCalled();
    expect(component.isEditModalOpen).toBe(false);
    expect(account.getModerators).toHaveBeenCalledOnce();
  });

  it('keeps edit data and the roster unchanged when PUT fails', () => {
    account.updateModerator.mockReturnValue(throwError(() => ({ error: { message: 'رفض التعديل' } })));
    component.dataSource.data = [moderator];
    component.openEditModal(moderator);
    component.editForm.patchValue({ fullName: 'اسم جديد' });
    component.submitEdit();
    expect(component.isEditModalOpen).toBe(true);
    expect(component.editForm.controls.fullName.value).toBe('اسم جديد');
    expect(component.dataSource.data).toEqual([moderator]);
    expect(component.isSaving).toBe(false);
    expect(Swal.fire).toHaveBeenCalledWith('خطأ', 'رفض التعديل', 'error');
    expect(account.createModerator).not.toHaveBeenCalled();
  });

  it('does not show success for a rejected API response', () => {
    account.updateModerator.mockReturnValue(of({ success: false, message: 'غير مسموح' }));
    component.openEditModal(moderator);
    component.submitEdit();
    expect(component.isEditModalOpen).toBe(true);
    expect(Swal.fire).toHaveBeenCalledWith('خطأ', 'غير مسموح', 'error');
    expect(account.getModerators).not.toHaveBeenCalled();
  });

  it('includes salary and currency in create without sending status', () => {
    component.openAddModal();
    component.addForm.setValue({
      userName: 'new_moderator', password: 'password123', fullName: 'مشرف جديد',
      phoneNumber: '01112345678', fixedMonthlySalary: 1800, salaryCurrency: 'EGP',
    });
    component.submitAdd();
    expect(account.createModerator).toHaveBeenCalledWith(component.addForm.getRawValue());
    expect(account.createModerator.mock.calls[0][0]).not.toHaveProperty('status');
  });

  it('blocks invalid salary and duplicate in-flight submissions', () => {
    const pending = new Subject();
    account.updateModerator.mockReturnValue(pending);
    component.openEditModal(moderator);
    component.editForm.patchValue({ fixedMonthlySalary: -1 });
    component.submitEdit();
    expect(account.updateModerator).not.toHaveBeenCalled();
    component.editForm.patchValue({ fixedMonthlySalary: 0 });
    component.submitEdit();
    component.submitEdit();
    expect(account.updateModerator).toHaveBeenCalledOnce();
  });

  it('shows load failure without inventing moderator records', () => {
    account.getModerators.mockReturnValue(throwError(() => new Error('offline')));
    component.loadModerators();
    expect(component.dataSource.data).toEqual([]);
    expect(component.loadError).toContain('تعذر تحميل');
    expect(component.isLoading).toBe(false);
  });

  it('retains the roster when delete fails', async () => {
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true, isDenied: false, isDismissed: false });
    account.deleteModerator.mockReturnValue(throwError(() => ({ error: { message: 'رفض الحذف' } })));
    component.dataSource.data = [moderator];
    component.deleteModerator(moderator.id);
    await Promise.resolve();
    expect(account.deleteModerator).toHaveBeenCalledWith(moderator.id);
    expect(component.dataSource.data).toEqual([moderator]);
    expect(Swal.fire).toHaveBeenLastCalledWith('خطأ', 'رفض الحذف', 'error');
    expect(account.getModerators).not.toHaveBeenCalled();
  });

  it('cancelling delete never calls the API', async () => {
    component.deleteModerator(moderator.id);
    await Promise.resolve();
    expect(account.deleteModerator).not.toHaveBeenCalled();
  });
  function serverPage(items: ModeratorRecord[], pageNumber: number, totalCount: number) {
    const pageSize = 20;
    return { success: true, data: { items, pageNumber, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize), hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < Math.ceil(totalCount / pageSize) } };
  }

  it('requests the second server page to show the 21st moderator without slicing it again', () => {
    const first = Array.from({ length: 20 }, (_, index) => ({ ...moderator, id: `m-${index}` }));
    const last = { ...moderator, id: 'm-21', fullName: 'المشرف الأخير' };
    account.getModerators.mockReturnValueOnce(of(serverPage(first, 1, 21))).mockReturnValueOnce(of(serverPage([last], 2, 21)));
    component.loadModerators();
    expect(component.totalCount).toBe(21); expect(component.visibleModerators).toHaveLength(20);
    component.changePage({ pageNumber: 2, pageSize: 20 });
    expect(account.getModerators).toHaveBeenLastCalledWith({ PageNumber: 2, PageSize: 20 });
    expect(component.visibleModerators).toEqual([last]); expect(component.canNext).toBe(false);
  });

  it('resets the server page after changing page size and searching', () => {
    vi.useFakeTimers();
    account.getModerators.mockReturnValue(of(serverPage([moderator], 2, 41)));
    component.ngOnInit(); component.pageNumber = 2;
    component.changePage({ pageNumber: 2, pageSize: 50 });
    expect(account.getModerators).toHaveBeenLastCalledWith({ PageNumber: 1, PageSize: 50 });
    component.pageSize = 20;
    component.search('  مشرف & أحمد  '); vi.advanceTimersByTime(300);
    expect(account.getModerators).toHaveBeenLastCalledWith({ PageNumber: 1, PageSize: 20, Search: 'مشرف & أحمد' });
  });

  it('does not invent an overall total when the server omits it', () => {
    account.getModerators.mockReturnValue(of({ data: { items: [moderator], pageNumber: 1, pageSize: 20, hasNextPage: true } }));
    component.loadModerators(); expect(component.paginatorCount).toBeNull(); expect(component.canNext).toBe(true);
  });

  it('ignores an older page response that arrives after the latest request', () => {
    const first = new Subject<any>(); const second = new Subject<any>();
    account.getModerators.mockReturnValueOnce(first).mockReturnValueOnce(second);
    component.loadModerators(); component.pageNumber = 2; component.loadModerators();
    second.next(serverPage([{ ...moderator, id: 'fresh' }], 2, 21));
    first.next(serverPage([{ ...moderator, id: 'stale' }], 1, 21));
    expect(component.visibleModerators[0].id).toBe('fresh'); expect(component.pageNumber).toBe(2);
  });

  it('returns to the last existing server page after deleting its only remaining row', async () => {
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true, isDenied: false, isDismissed: false });
    component.pageNumber = 2;
    account.getModerators.mockReturnValueOnce(of(serverPage([], 2, 20))).mockReturnValueOnce(of(serverPage([moderator], 1, 20)));
    component.deleteModerator(moderator.id); await Promise.resolve();
    expect(account.getModerators.mock.calls.map(call => call[0].PageNumber)).toEqual([2, 1]);
    expect(component.pageNumber).toBe(1); expect(component.visibleModerators).toEqual([moderator]);
  });

  it('does not invalidate an in-flight search when only surrounding spaces change', () => {
    vi.useFakeTimers(); const pending = new Subject<any>();
    account.getModerators.mockReturnValue(pending); component.ngOnInit();
    component.search('مشرف'); vi.advanceTimersByTime(300); component.search('  مشرف  ');
    pending.next(serverPage([moderator], 1, 1));
    expect(component.isLoading).toBe(false); expect(component.visibleModerators).toEqual([moderator]);
    expect(account.getModerators).toHaveBeenCalledTimes(2);
  });

  it('never labels the previous twenty moderators as page2 when that page fails, and retries page2', () => {
    const first = Array.from({length:20}, (_,index) => ({...moderator,id:`moderator-${index}`}));
    account.getModerators.mockReturnValueOnce(of(serverPage(first,1,21)));
    component.loadModerators();
    account.getModerators.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.changePage({pageNumber:2,pageSize:20});
    expect(component.visibleModerators).toEqual([]);
    expect(component.pageNumber).toBe(2);
    expect(component.totalCount).toBeNull(); expect(component.totalPages).toBeNull();
    expect(component.canNext).toBe(false); expect(component.loadError).toContain('offline');
    const last={...moderator,id:'moderator-21'};
    account.getModerators.mockReturnValueOnce(of(serverPage([last],2,21)));
    component.loadModerators();
    expect(account.getModerators).toHaveBeenLastCalledWith({PageNumber:2,PageSize:20});
    expect(component.visibleModerators).toEqual([last]); expect(component.totalCount).toBe(21);
  });

  it('clears old records/totals immediately for a new server search and retries the failed search on page1', () => {
    vi.useFakeTimers();
    account.getModerators.mockReturnValueOnce(of(serverPage([{...moderator,id:'old'}],2,21)));
    component.ngOnInit();
    account.getModerators.mockReturnValueOnce(throwError(() => new Error('search failed')));
    component.search('  بحث جديد  ');
    expect(component.isLoading).toBe(true); expect(component.visibleModerators).toEqual([]);
    expect(component.totalCount).toBeNull(); expect(component.pageNumber).toBe(1);
    component.changePage({pageNumber:2,pageSize:20});
    vi.advanceTimersByTime(300);
    expect(component.loadError).toContain('search failed'); expect(component.visibleModerators).toEqual([]);
    expect(component.canNext).toBe(false); expect(component.totalCount).toBeNull();
    account.getModerators.mockReturnValueOnce(of(serverPage([{...moderator,id:'matching'}],1,1)));
    component.loadModerators();
    expect(account.getModerators).toHaveBeenLastCalledWith({PageNumber:1,PageSize:20,Search:'بحث جديد'});
    expect(component.visibleModerators[0].id).toBe('matching'); expect(component.totalCount).toBe(1);
  });

  it('does not retain old totals or rows when a page-size change fails', () => {
    account.getModerators.mockReturnValueOnce(of(serverPage([{...moderator,id:'old'}],2,21)));
    component.loadModerators();
    account.getModerators.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.changePage({pageNumber:2,pageSize:50});
    expect(component.pageNumber).toBe(1); expect(component.pageSize).toBe(50);
    expect(component.visibleModerators).toEqual([]); expect(component.totalCount).toBeNull();
    account.getModerators.mockReturnValueOnce(of({data:{items:[moderator],pageNumber:1,pageSize:50,totalCount:1}}));
    component.loadModerators();expect(account.getModerators).toHaveBeenLastCalledWith({PageNumber:1,PageSize:50});
  });

});
