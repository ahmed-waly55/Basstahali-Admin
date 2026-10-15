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

  beforeEach(() => {
    account = {
      getModerators: vi.fn().mockReturnValue(of({ success: true, data: [moderator] })),
      createModerator: vi.fn().mockReturnValue(of({ success: true })),
      updateModerator: vi.fn().mockReturnValue(of({ success: true })),
      deleteModerator: vi.fn().mockReturnValue(of({ success: true })),
    };
    TestBed.configureTestingModule({ imports: [Moderator], providers: [{ provide: Account, useValue: account }] });
    component = TestBed.runInInjectionContext(() => new Moderator());
    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: false, isDenied: false, isDismissed: true });
  });

  afterEach(() => vi.restoreAllMocks());

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
});
