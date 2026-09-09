import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';

import { PayoutsService } from '../../core/services/payouts-service';
import { Account } from '../../core/services/account';

@Component({
  selector: 'app-payouts-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatDividerModule,
    MatSelectModule,
    MatTabsModule
  ],
  templateUrl: './payouts-management.html',
  styleUrl: './payouts-management.css',
})
export class PayoutsManagementComponent implements OnInit {
  private payoutsService = inject(PayoutsService);
  private teacherService = inject(Account);
  private fb = inject(FormBuilder);

  teacherPayouts = signal<any[]>([]);
  teachers = signal<any[]>([]);

  // حفظ معلومات الفترة الحالية القادمة من الـ API
  payoutPeriodInfo = signal<{ from: string; to: string; count: number } | null>(null);

  // أعمدة الجدول المحدثة (أضفنا عموداً جديداً للعمليات المالية الخاصة بالباي رول إذا رغبت، أو احتفظت بالأعمدة الحالية)
  displayedColumns: string[] = [
    'teacherName',
    'phoneNumber',
    'sessionCount',
    'grossSalary',
    'totalBonus',
    'totalDeductions',
    'netSalary',
    'actions'
  ];

  periodForm: FormGroup = this.fb.group({
    startDate: ['', Validators.required],
    endDate: ['', Validators.required]
  });

  adjustmentForm: FormGroup = this.fb.group({
    teacherPayoutId: ['', Validators.required],
    type: ['', Validators.required],
    requestedAmount: [0, [Validators.required, Validators.min(1)]],
    reason: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadTeacherPayouts();
    this.loadTeachers();
  }

  loadTeacherPayouts() {
    this.payoutsService.getTeacherPayouts().subscribe({
      next: (response: any) => {
        if (response && response.success && response.data) {
          this.payoutPeriodInfo.set({
            from: response.data.from,
            to: response.data.to,
            count: response.data.count
          });
          const items = response.data.items || [];
          this.teacherPayouts.set(items);
        }
      },
      error: (err) => {
        console.error('Error fetching teacher payouts', err);
        Swal.fire('خطأ', 'فشل تحميل مستحقات المعلمين.', 'error');
      }
    });
  }

  loadTeachers() {
    this.teacherService.getTeachers().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data?.items || res?.data || res?.items || []);
        this.teachers.set(list);
      },
      error: (err) => {
        console.error('Error fetching teachers', err);
      }
    });
  }

  onCreatePeriod() {
    if (this.periodForm.invalid) {
      this.periodForm.markAllAsTouched();
      return;
    }

    this.payoutsService.createPayoutPeriod(this.periodForm.value).subscribe({
      next: () => {
        Swal.fire('نجاح', 'تم إنشاء فترة الصرف بنجاح', 'success');
        this.periodForm.reset();
        this.loadTeacherPayouts();
      },
      error: () => Swal.fire('خطأ', 'فشل إنشاء فترة الصرف', 'error')
    });
  }

  // تنفيذ إجراء القبول (Approve) العام
  onApproveAction(teacherId: string) {
    Swal.fire({
      title: 'تأكيد الاعتماد',
      text: 'هل أنت متأكد من رغبتك في اعتماد مستحقات هذا المعلم؟',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم، اعتماد',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.payoutsService.updateTeacherPayoutAction(teacherId, 'approve').subscribe({
          next: () => {
            Swal.fire('تم!', 'تم اعتماد المستحقات بنجاح', 'success');
            this.loadTeacherPayouts();
          },
          error: (err) => {
            console.error('Error approving payout', err);
            Swal.fire('خطأ', 'فشل اعتماد المستحقات', 'error');
          }
        });
      }
    });
  }

  // تنفيذ إجراء الرفض (Reject) مع نافذة لطلب السبب
  onRejectAction(teacherId: string) {
    Swal.fire({
      title: 'رفض المستحقات',
      input: 'textarea',
      inputLabel: 'سبب الرفض',
      inputPlaceholder: 'اكتب سبب الرفض هنا...',
      inputAttributes: {
        'aria-label': 'اكتب سبب الرفض هنا'
      },
      showCancelButton: true,
      confirmButtonText: 'تأكيد الرفض',
      cancelButtonText: 'إلغاء',
      inputValidator: (value) => {
        if (!value) {
          return 'يجب كتابة سبب الرفض!';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.payoutsService.rejectTeacherPayout(teacherId, result.value).subscribe({
          next: () => {
            Swal.fire('تم!', 'تم رفض المستحقات بنجاح', 'success');
            this.loadTeacherPayouts();
          },
          error: (err) => {
            console.error('Error rejecting payout', err);
            Swal.fire('خطأ', 'فشل رفض المستحقات', 'error');
          }
        });
      }
    });
  }

  // ==========================================================
  // 🚀 استخدام الـ APIs الجديدة الخاصة بالـ Payroll في الـ UI
  // ==========================================================

  // 1. تعديل راتب المعلم (PUT: /api/v1/payroll/teachers/{teacherId})
  onUpdateTeacherPayroll(teacher: any) {
    Swal.fire({
      title: 'تعديل راتب المعلم',
      html: `
        <div style="text-align: right; display: flex; flex-direction: column; gap: 10px;">
          <label>من تاريخ:</label>
          <input type="date" id="edit-from" class="swal2-input !w-full !m-0" value="${teacher.from || ''}">

          <label>إلى تاريخ:</label>
          <input type="date" id="edit-to" class="swal2-input !w-full !m-0" value="${teacher.to || ''}">

          <label>عدد الحصص:</label>
          <input type="number" id="edit-sessions" class="swal2-input !w-full !m-0" value="${teacher.sessionCount || 0}">

          <label>سعر الحصة:</label>
          <input type="number" id="edit-rate" class="swal2-input !w-full !m-0" value="${teacher.sessionRate || 0}">

          <label>المكافأة:</label>
          <input type="number" id="edit-bonus" class="swal2-input !w-full !m-0" value="${teacher.bonus || 0}">

          <label>سبب المكافأة:</label>
          <input type="text" id="edit-bonus-reason" class="swal2-input !w-full !m-0" placeholder="سبب المكافأة" value="${teacher.bonusReason || ''}">

          <label>الخصم:</label>
          <input type="number" id="edit-deduction" class="swal2-input !w-full !m-0" value="${teacher.deduction || 0}">

          <label>سبب الخصم:</label>
          <input type="text" id="edit-deduction-reason" class="swal2-input !w-full !m-0" placeholder="سبب الخصم" value="${teacher.deductionReason || ''}">

          <label>ملاحظات:</label>
          <textarea id="edit-notes" class="swal2-textarea !w-full !m-0" placeholder="ملاحظات إضافية">${teacher.notes || ''}</textarea>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: 'حفظ التعديلات',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        return {
          from: (document.getElementById('edit-from') as HTMLInputElement).value,
          to: (document.getElementById('edit-to') as HTMLInputElement).value,
          sessionCount: Number((document.getElementById('edit-sessions') as HTMLInputElement).value),
          sessionRate: Number((document.getElementById('edit-rate') as HTMLInputElement).value),
          bonus: Number((document.getElementById('edit-bonus') as HTMLInputElement).value),
          bonusReason: (document.getElementById('edit-bonus-reason') as HTMLInputElement).value,
          deduction: Number((document.getElementById('edit-deduction') as HTMLInputElement).value),
          deductionReason: (document.getElementById('edit-deduction-reason') as HTMLInputElement).value,
          notes: (document.getElementById('edit-notes') as HTMLTextAreaElement).value
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.payoutsService.updateTeacherPayroll(teacher.teacherId, result.value).subscribe({
          next: () => {
            Swal.fire('نجاح', 'تم تحديث بيانات الرواتب بنجاح', 'success');
            this.loadTeacherPayouts();
          },
          error: (err) => {
            console.error('Error updating payroll', err);
            Swal.fire('خطأ', 'فشل تحديث بيانات الرواتب', 'error');
          }
        });
      }
    });
  }

  // 2. اعتماد راتب المعلم (POST: /api/v1/payroll/teachers/{teacherId}/approve)
  onApproveTeacherPayrollWithData(teacher: any) {
    Swal.fire({
      title: 'اعتماد الراتب النهائي',
      html: `
        <div style="text-align: right; display: flex; flex-direction: column; gap: 10px;">
          <label>من تاريخ:</label>
          <input type="date" id="app-from" class="swal2-input !w-full !m-0" value="${teacher.from || ''}">

          <label>إلى تاريخ:</label>
          <input type="date" id="app-to" class="swal2-input !w-full !m-0" value="${teacher.to || ''}">

          <label>المبلغ النهائي (Final Amount):</label>
          <input type="number" id="app-amount" class="swal2-input !w-full !m-0" value="${teacher.netSalary || 0}">

          <label>ملاحظات:</label>
          <textarea id="app-notes" class="swal2-textarea !w-full !m-0" placeholder="ملاحظات الاعتماد"></textarea>
        </div>
      `,
      width: '500px',
      showCancelButton: true,
      confirmButtonText: 'تأكيد الاعتماد',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        return {
          from: (document.getElementById('app-from') as HTMLInputElement).value,
          to: (document.getElementById('app-to') as HTMLInputElement).value,
          finalAmount: Number((document.getElementById('app-amount') as HTMLInputElement).value),
          notes: (document.getElementById('app-notes') as HTMLTextAreaElement).value
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.payoutsService.approveTeacherPayroll(teacher.teacherId, result.value).subscribe({
          next: () => {
            Swal.fire('نجاح', 'تم اعتماد راتب المعلم بنجاح', 'success');
            this.loadTeacherPayouts();
          },
          error: (err) => {
            console.error('Error approving teacher payroll', err);
            Swal.fire('خطأ', 'فشل اعتماد راتب المعلم', 'error');
          }
        });
      }
    });
  }

  onSubmitAdjustment() {
    if (this.adjustmentForm.invalid) {
      this.adjustmentForm.markAllAsTouched();
      return;
    }

    this.payoutsService.createPayoutAdjustment(this.adjustmentForm.value).subscribe({
      next: () => {
        Swal.fire('نجاح', 'تم إرسال طلب التعديل بنجاح', 'success');
        this.adjustmentForm.reset();
      },
      error: () => Swal.fire('خطأ', 'فشل إرسال طلب التعديل', 'error')
    });
  }
}
