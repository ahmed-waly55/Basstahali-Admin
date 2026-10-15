import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { FinanceManagementService } from '../../core/services/finance-management-service';

function orderedDates(start: string, end: string) {
  return (control: AbstractControl): ValidationErrors | null => {
    const from = control.get(start)?.value;
    const to = control.get(end)?.value;
    return from && to && from > to ? { dateOrder: true } : null;
  };
}

@Component({
  selector: 'app-finance-management', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatTabsModule],
  templateUrl: './finance-management.html', styleUrl: './finance-management.css'
})
export class FinanceManagement implements OnInit {
  private api = inject(FinanceManagementService);
  private fb = inject(FormBuilder);
  periods = signal<any[]>([]);
  partners = signal<any[]>([]);
  teachers = signal<any[]>([]);
  moderators = signal<any[]>([]);
  loading = signal(false);
  pending = signal(false);
  error = signal('');
  notices = signal<Record<string, string>>({});
  success = signal('');
  selectedTeacher = signal<any>(null);
  selectedAdjustment = signal<any>(null);
  private activeLoads = 0;
  periodForm = this.fb.nonNullable.group({ startDate: ['', Validators.required], endDate: ['', Validators.required] }, { validators: orderedDates('startDate', 'endDate') });
  shareForm = this.fb.nonNullable.group({
    partnerId: ['', Validators.required], percentage: [0, [Validators.required, Validators.min(0.01), Validators.max(100)]],
    effectiveFrom: ['', Validators.required], effectiveTo: ['', Validators.required]
  }, { validators: orderedDates('effectiveFrom', 'effectiveTo') });
  payrollForm = this.fb.nonNullable.group({
    from: ['', Validators.required], to: ['', Validators.required], sessionCount: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    sessionRate: [0, [Validators.required, Validators.min(0)]], bonus: [0, [Validators.required, Validators.min(0)]], bonusReason: [''],
    deduction: [0, [Validators.required, Validators.min(0)]], deductionReason: [''], notes: ['']
  }, { validators: orderedDates('from', 'to') });
  approvalForm = this.fb.nonNullable.group({ from: ['', Validators.required], to: ['', Validators.required],
    finalAmount: [0, [Validators.required, Validators.min(0)]], notes: ['']
  }, { validators: orderedDates('from', 'to') });
  adjustmentForm = this.fb.nonNullable.group({ amount: [0, [Validators.required, Validators.min(0.01)]], reason: ['', Validators.required],
    effectiveDate: [new Date().toISOString().slice(0, 10), Validators.required] });

  ngOnInit(): void { this.refresh(); }
  refresh(): void { this.loadPeriods(); this.loadPartners(); this.loadTeachers(); this.loadModerators(); }
  private load(key: string, request: Observable<any>, destination: { set(value: any[]): void }): void {
    this.activeLoads++;
    this.loading.set(true);
    this.notices.update((notices) => ({ ...notices, [key]: '' }));
    request.subscribe({
      next: (res) => {
        this.finishLoad();
        const data = res?.data ?? res;
        const rows = data?.items ?? data;
        if (res?.success === false || !Array.isArray(rows)) {
          this.notices.update((notices) => ({ ...notices, [key]: res?.message || 'تعذر تحميل البيانات. أعد المحاولة.' })); return;
        }
        destination.set(key === 'teachers' || key === 'moderators'
          ? rows.map((row: any) => ({ ...row, from: row.from ?? data.from, to: row.to ?? data.to }))
          : rows);
      },
      error: (err) => { this.finishLoad(); this.notices.update((notices) => ({ ...notices, [key]: err?.error?.message || 'تعذر تحميل البيانات. أعد المحاولة.' })); }
    });
  }
  private finishLoad(): void { this.activeLoads--; this.loading.set(this.activeLoads > 0); }
  loadPeriods(): void { this.load('periods', this.api.getFinancialPeriods(), this.periods); }
  loadPartners(): void { this.load('partners', this.api.getPartners(), this.partners); }
  loadTeachers(): void { this.load('teachers', this.api.getTeacherPayroll(), this.teachers); }
  loadModerators(): void { this.load('moderators', this.api.getModeratorPayroll(), this.moderators); }

  private async mutate(title: string, request: () => Observable<any>, completed: () => void): Promise<void> {
    if (this.pending()) return;
    const confirm = await Swal.fire({ title, text: 'سيتم تسجيل هذا الإجراء على البيانات المالية للأكاديمية.', icon: 'question', showCancelButton: true,
      confirmButtonText: 'تأكيد', cancelButtonText: 'إلغاء', confirmButtonColor: '#542394' });
    if (!confirm.isConfirmed || this.pending()) return;
    this.pending.set(true); this.error.set(''); this.success.set('');
    request().subscribe({
      next: (res) => {
        this.pending.set(false);
        if (res?.success === false) { this.error.set(res.message || 'تعذر إتمام العملية'); return; }
        this.success.set(res?.message || 'تم حفظ البيانات بنجاح'); completed();
      },
      error: (err) => { this.pending.set(false); this.error.set(err?.error?.message || 'تعذر إتمام العملية. يمكنك إعادة المحاولة بنفس البيانات.'); }
    });
  }

  createPeriod(): void {
    if (this.periodForm.invalid) { this.periodForm.markAllAsTouched(); return; }
    void this.mutate('إنشاء فترة مالية؟', () => this.api.createFinancialPeriod(this.periodForm.getRawValue()), () => { this.periodForm.reset(); this.loadPeriods(); });
  }
  isClosed(period: any): boolean { return period.isClosed === true || period.status === 'Closed' || !!period.closedAt; }
  closePeriod(period: any): void {
    if (!period.id || this.isClosed(period)) return;
    void this.mutate('إغلاق الفترة المالية؟', () => this.api.closeFinancialPeriod(period.id), () => this.loadPeriods());
  }
  createShare(): void {
    if (this.shareForm.invalid) { this.shareForm.markAllAsTouched(); return; }
    void this.mutate('حفظ نسبة الشريك؟', () => this.api.createPartnerShare(this.shareForm.getRawValue()), () => this.shareForm.reset());
  }
  teacherId(item: any): string { return item.teacherId || item.teacher?.id || ''; }
  chooseTeacher(item: any): void {
    if (!this.teacherId(item) || this.pending()) return;
    this.selectedTeacher.set(item);
    const from = (item.from || '').slice(0, 10), to = (item.to || '').slice(0, 10);
    this.payrollForm.setValue({ from, to, sessionCount: Number(item.sessionCount || 0), sessionRate: Number(item.sessionRate || 0),
      bonus: Number(item.bonus ?? item.totalBonus ?? 0), bonusReason: item.bonusReason || '', deduction: Number(item.deduction ?? item.totalDeductions ?? 0),
      deductionReason: item.deductionReason || '', notes: item.notes || '' });
    this.approvalForm.setValue({ from, to, finalAmount: Number(item.finalAmount ?? item.netSalary ?? 0), notes: item.notes || '' });
  }
  savePayroll(): void {
    const id = this.teacherId(this.selectedTeacher() || {});
    if (!id || this.payrollForm.invalid) { this.payrollForm.markAllAsTouched(); return; }
    void this.mutate('حفظ تعديل راتب المعلم؟', () => this.api.updateTeacherPayroll(id, this.payrollForm.getRawValue()), () => this.loadTeachers());
  }
  approvePayroll(): void {
    const id = this.teacherId(this.selectedTeacher() || {});
    if (!id || this.approvalForm.invalid) { this.approvalForm.markAllAsTouched(); return; }
    void this.mutate('اعتماد المبلغ النهائي لراتب المعلم؟', () => this.api.approveTeacherPayroll(id, this.approvalForm.getRawValue()), () => this.loadTeachers());
  }
  chooseAdjustment(item: any): void {
    // The contract does not enumerate targetType. Reuse only a server-provided value.
    if (!item.targetType || !(item.targetId || item.teacherId || item.moderatorId) || this.pending()) return;
    this.selectedAdjustment.set(item);
  }
  saveAdjustment(): void {
    const item = this.selectedAdjustment();
    if (!item?.targetType || this.adjustmentForm.invalid) { this.adjustmentForm.markAllAsTouched(); return; }
    const targetId = item.targetId || item.teacherId || item.moderatorId;
    void this.mutate('إضافة مكافأة للراتب؟', () => this.api.createPayrollAdjustment(item.targetType, targetId, { type: 'Bonus', ...this.adjustmentForm.getRawValue() }),
      () => { this.adjustmentForm.reset({ effectiveDate: new Date().toISOString().slice(0, 10) }); this.selectedAdjustment.set(null); this.loadTeachers(); this.loadModerators(); });
  }
}
