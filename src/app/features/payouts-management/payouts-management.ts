import { Component, OnInit, signal, inject, computed } from '@angular/core';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PayoutsService, PayoutAction } from '../../core/services/payouts-service';
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
    MatTabsModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './payouts-management.html',
  styleUrl: './payouts-management.css',
})
export class PayoutsManagementComponent implements OnInit {
  private payoutsService = inject(PayoutsService);
  private teacherService = inject(Account);
  private fb = inject(FormBuilder);

  isLoading = signal<boolean>(false);
  payouts = signal<any[]>([]);
  payoutPeriods = signal<any[]>([]);
  teachers = signal<any[]>([]);
  workflowInfo = signal<any>(null);

  // وضع العرض الحالي: 'payouts' (كشوف الرواتب التفاعلية) أو 'summary' (الملخص العام)
  viewMode = signal<'payouts' | 'summary'>('payouts');

  // فلاتر البحث
  selectedPeriodId = signal<string>('');
  selectedTeacherId = signal<string>('');
  selectedStatus = signal<string>('');

  // معلومات الفترة من الملخص
  periodInfo = signal<{ from: string; to: string; count: number } | null>(null);

  // إحصائيات سريعة
  totalNet = computed(() => {
    return this.payouts().reduce((sum, item) => sum + (Number(item.netSalary || item.finalAmount || item.grossSalary) || 0), 0);
  });

  totalSessions = computed(() => {
    return this.payouts().reduce((sum, item) => sum + (Number(item.sessionCount) || 0), 0);
  });

  displayedColumns: string[] = [
    'teacherName',
    'phoneNumber',
    'sessionCount',
    'grossSalary',
    'totalBonus',
    'totalDeductions',
    'netSalary',
    'status',
    'actions'
  ];

  periodForm: FormGroup = this.fb.group({
    startDate: ['', Validators.required],
    endDate: ['', Validators.required]
  });

  adjustmentForm: FormGroup = this.fb.group({
    teacherPayoutId: ['', Validators.required],
    type: ['', Validators.required],
    requestedAmount: [null, [Validators.required, Validators.min(1)]],
    reason: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadPeriods();
    this.loadTeachers();
    this.loadWorkflow();
    this.loadData();
  }

  // جلب البيانات حسب الوضع المختار
  loadData() {
    if (this.viewMode() === 'payouts') {
      this.loadTeacherPayouts();
    } else {
      this.loadFinancialSummary();
    }
  }

  // جلب كشوف الرواتب الرسمية الفعالة مع الفلاتر
  loadTeacherPayouts() {
    this.isLoading.set(true);
    const filters = {
      periodId: this.selectedPeriodId() || undefined,
      teacherId: this.selectedTeacherId() || undefined,
      status: this.selectedStatus() || undefined
    };

    this.payoutsService.getTeacherPayouts(filters).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        const items = Array.isArray(res) ? res : (res?.data?.items || res?.data || []);
        this.payouts.set(items);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Error fetching payouts', err);
        // في حال كانت كشوف الرواتب فارغة في البداية ننتقل للملخص
        this.loadFinancialSummary();
      }
    });
  }

  // جلب الملخص المالي الشامل
  loadFinancialSummary() {
    this.isLoading.set(true);
    this.payoutsService.getFinancialSummary().subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        const data = res?.data || res;
        if (data) {
          if (data.from || data.to) {
            this.periodInfo.set({
              from: data.from,
              to: data.to,
              count: data.count || (data.items ? data.items.length : 0)
            });
          }
          const items = data.items || (Array.isArray(data) ? data : []);
          this.payouts.set(items);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Error fetching financial summary', err);
        Swal.fire('خطأ', 'فشل تحميل بيانات الرواتب.', 'error');
      }
    });
  }

  loadPeriods() {
    this.payoutsService.getPayoutPeriods().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data?.items || res?.data || []);
        this.payoutPeriods.set(list);
      },
      error: (err) => console.error('Error fetching periods', err)
    });
  }

  loadTeachers() {
    this.teacherService.getTeachers().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data?.items || res?.data || res?.items || []);
        this.teachers.set(list);
      },
      error: (err) => console.error('Error fetching teachers', err)
    });
  }

  loadWorkflow() {
    this.payoutsService.getWorkflow().subscribe({
      next: (res: any) => this.workflowInfo.set(res?.data || res),
      error: (err) => console.error('Workflow load error', err)
    });
  }

  // استخراج الـ Payout ID بشكل آمن
  private getPayoutId(element: any): string | null {
    return element?.id || element?._id || element?.teacherPayoutId || null;
  }

  // تنفيذ الـ Action المطلوب (Submit, Approve, Pay)
  onExecuteAction(element: any, action: PayoutAction) {
    const payoutId = this.getPayoutId(element);

    if (!payoutId) {
      Swal.fire({
        title: 'كشف غير مولّد بعد',
        html: `
          <div class="text-right text-sm">
            هذا السجل قادم من الملخص العام ولم يتم توليد كشف رسمي له حتى الآن.
            <br><br>
            <strong>لإتاحة الاعتماد والصرف:</strong>
            <ol class="list-decimal pr-4 mt-2 space-y-1 text-slate-600">
              <li>اختر الفترة المالية من القائمة العلوية.</li>
              <li>اضغط على <b>"توليد المستحقات"</b> لإنشاء كشوف الرواتب الرسمية.</li>
              <li>ستتمكن بعدها من اعتمادها وصرفها فوراً.</li>
            </ol>
          </div>
        `,
        icon: 'info',
        confirmButtonText: 'حسناً'
      });
      return;
    }

    const actionText: Record<PayoutAction, { title: string; desc: string; btn: string }> = {
      Submit: { title: 'إرسال للمراجعة', desc: 'هل تريد إرسال هذا الكشف من Draft إلى PendingReview؟', btn: 'إرسال' },
      Approve: { title: 'اعتماد كشف الراتب', desc: 'هل أنت متأكد من اعتماد هذا الكشف المالي؟', btn: 'اعتماد' },
      Pay: { title: 'صرف الراتب ماليًا', desc: 'سيتم تسجيل عملية الصرف ماليًا للمدرس ونقله لحالة Paid.', btn: 'تأكيد الصرف' },
      Reject: { title: '', desc: '', btn: '' }
    };

    Swal.fire({
      title: actionText[action].title,
      text: actionText[action].desc,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: actionText[action].btn,
      cancelButtonText: 'إلغاء'
    }).then((res) => {
      if (res.isConfirmed) {
        this.isLoading.set(true);
        this.payoutsService.executePayoutAction(payoutId, action).subscribe({
          next: (response: any) => {
            this.isLoading.set(false);
            const amt = response?.finalAmount ? `المبلغ النهائي: ${response.finalAmount} ${response.currency || 'EGP'}` : '';
            Swal.fire('تم بنجاح', `تم تنفيذ الإجراء بنجاح. ${amt}`, 'success');
            this.loadData();
          },
          error: (err) => {
            this.isLoading.set(false);
            console.error(`Error executing ${action}`, err);
            Swal.fire('خطأ', err?.error?.message || `فشل تنفيذ إجراء ${action}`, 'error');
          }
        });
      }
    });
  }

  // رفض كشف الراتب مع سبب الرفض الإلزامي
  onRejectAction(element: any) {
    const payoutId = this.getPayoutId(element);

    if (!payoutId) {
      Swal.fire('تنبيه', 'يجب توليد كشف الراتب أولاً لتتمكن من رفضه أو اعتماده.', 'warning');
      return;
    }

    Swal.fire({
      title: 'رفض كشف الراتب',
      input: 'textarea',
      inputLabel: 'سبب الرفض',
      inputPlaceholder: 'اكتب سبب الرفض بالتفصيل هنا...',
      showCancelButton: true,
      confirmButtonText: 'تأكيد الرفض',
      cancelButtonText: 'إلغاء',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'سبب الرفض إلزامي!';
        }
        return null;
      }
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        this.isLoading.set(true);
        this.payoutsService.rejectTeacherPayout(payoutId, res.value).subscribe({
          next: () => {
            this.isLoading.set(false);
            Swal.fire('تم الرفض', 'تم نقل الكشف إلى Rejected بنجاح.', 'success');
            this.loadData();
          },
          error: (err) => {
            this.isLoading.set(false);
            Swal.fire('خطأ', err?.error?.message || 'فشل رفض كشف الراتب', 'error');
          }
        });
      }
    });
  }

  // إنشاء فترة جديدة
  onCreatePeriod() {
    if (this.periodForm.invalid) {
      this.periodForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.payoutsService.createPayoutPeriod(this.periodForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        Swal.fire('نجاح', 'تم إنشاء فترة الصرف بنجاح.', 'success');
        this.periodForm.reset();
        this.loadPeriods();
      },
      error: (err) => {
        this.isLoading.set(false);
        Swal.fire('خطأ', err?.error?.message || 'فشل إنشاء فترة الصرف', 'error');
      }
    });
  }

  // توليد المستحقات لفترة محددة
  onGeneratePayouts() {
    const periodId = this.selectedPeriodId();
    if (!periodId) {
      Swal.fire('تنبيه', 'يرجى اختيار الفترة أولاً لتوليد المستحقات', 'warning');
      return;
    }

    Swal.fire({
      title: 'توليد المستحقات من الحصص',
      text: 'هل تود احتساب الحصص وتوليد كشوف الرواتب لهذه الفترة؟',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم، توليد الآن',
      cancelButtonText: 'إلغاء'
    }).then((res) => {
      if (res.isConfirmed) {
        this.isLoading.set(true);
        this.payoutsService.generatePeriodPayouts(periodId).subscribe({
          next: (resp: any) => {
            this.isLoading.set(false);
            Swal.fire('نجاح', resp?.message || 'تم توليد المستحقات وكشوف الرواتب بنجاح.', 'success');
            this.viewMode.set('payouts');
            this.loadTeacherPayouts();
          },
          error: (err) => {
            this.isLoading.set(false);
            Swal.fire('خطأ', err?.error?.message || 'فشل توليد المستحقات.', 'error');
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

    this.isLoading.set(true);
    this.payoutsService.createPayoutAdjustment(this.adjustmentForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        Swal.fire('نجاح', 'تم إرسال طلب التعديل بنجاح.', 'success');
        this.adjustmentForm.reset();
      },
      error: (err) => {
        this.isLoading.set(false);
        Swal.fire('خطأ', err?.error?.message || 'فشل إرسال طلب التعديل.', 'error');
      }
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'Draft': return 'مسودة';
      case 'PendingReview': return 'قيد المراجعة';
      case 'Approved': return 'معتمد';
      case 'Rejected': return 'مرفوض';
      case 'Paid': return 'تم الصرف';
      default: return status || 'بانتظار التوليد';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Draft': return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'PendingReview': return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'Approved': return 'bg-blue-50 text-blue-700 border-blue-300';
      case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-300';
      case 'Paid': return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      default: return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  }
}
