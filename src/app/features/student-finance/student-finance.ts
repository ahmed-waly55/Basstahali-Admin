import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { A11yModule } from '@angular/cdk/a11y';
import { Observable } from 'rxjs';
import { FinanceRecord, StudentOption } from '../../core/models/student-finance';
import { FinanceOperationKey, financeList, isFinanceRecord, StudentFinanceService } from '../../core/services/student-finance';
import { User } from '../../core/services/user';

type FinanceTab = 'payments' | 'credits' | 'plans' | 'provider';
type FormName = 'payment' | 'credit' | 'plan' | 'installment';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const positive = [Validators.required, Validators.min(0.01)];
const positiveInteger = [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)];

function localDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localDateTime(): string {
  const date = new Date();
  return `${localDate()}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-student-finance',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatIconModule, A11yModule],
  templateUrl: './student-finance.html',
  styleUrl: './student-finance.css',
})
export class StudentFinance implements OnInit {
  private service = inject(StudentFinanceService);
  private users = inject(User);
  private fb = inject(FormBuilder).nonNullable;
  private destroyRef = inject(DestroyRef);
  private operationKeys = {
    payment: new FinanceOperationKey(), plan: new FinanceOperationKey(), installment: new FinanceOperationKey(),
  };
  private installmentContextId = '';
  private loadGeneration: Record<string, number> = {};

  tab = signal<FinanceTab>('payments');
  students = signal<StudentOption[]>([]);
  selectedStudentId = '';
  payments = signal<FinanceRecord[]>([]);
  credits = signal<FinanceRecord[]>([]);
  plans = signal<FinanceRecord[]>([]);
  providerPayments = signal<FinanceRecord[]>([]);
  providerDetail = signal<unknown>(null);
  summary = signal<unknown>(null);
  summaryFields = computed(() => this.fields(this.summary()));
  loading = signal<Record<string, boolean>>({});
  errors = signal<Record<string, string>>({});
  notice = signal('');
  openForm = signal<FormName | null>(null);
  saving = signal(false);
  creditNeedsReview = signal(false);
  activeInstallment = signal<FinanceRecord | null>(null);

  paymentForm = this.fb.group({
    amount: [0, positive], currency: ['EGP', Validators.required], paymentMethod: ['', Validators.required],
    paymentReference: [''], paidAt: [localDateTime(), Validators.required], notes: [''],
    purchasedCredits: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    subjectId: ['', Validators.pattern(uuid)], sessionId: ['', Validators.pattern(uuid)], purpose: ['', Validators.required],
  });
  creditForm = this.fb.group({
    credits: [1, positiveInteger], description: ['', Validators.required], validityDays: [30, positiveInteger],
  });
  planForm = this.fb.group({
    scope: ['Term' as const, Validators.required], totalAmount: [0, positive], currency: ['EGP', Validators.required],
    downPaymentAmount: [0, [Validators.required, Validators.min(0)]], installmentCount: [1, positiveInteger],
    startDate: [localDate(), Validators.required], firstDueDate: [localDate(), Validators.required],
    paymentMethod: ['', Validators.required], paymentReference: [''],
  });
  installmentForm = this.fb.group({
    amount: [0, positive], currency: ['EGP', Validators.required], paymentMethod: ['', Validators.required],
    paymentReference: [''], paidAt: [localDateTime(), Validators.required], notes: [''],
  });

  ngOnInit(): void {
    this.load('students', this.users.getStudents(), response => {
      this.students.set(financeList(response).flatMap(item => {
        const id = this.text(item, 'id');
        return id ? [{ id, fullName: this.text(item, 'fullName', 'name') || id }] : [];
      }));
    });
    this.refreshSummary();
    this.refreshPayments();
  }

  setTab(tab: FinanceTab): void {
    if (this.saving()) return;
    this.closeForm();
    this.tab.set(tab);
    if (tab === 'payments') this.refreshPayments();
    if (tab === 'credits') this.refreshCredits();
    if (tab === 'plans') this.refreshPlans();
    if (tab === 'provider') this.refreshProvider();
  }

  selectStudent(): void {
    this.closeForm();
    this.payments.set([]);
    this.credits.set([]);
    this.loadGeneration['credits'] = (this.loadGeneration['credits'] || 0) + 1;
    this.loading.update(value => ({ ...value, credits: false }));
    this.clearError('credits');
    this.refreshPayments();
    if (this.tab() === 'credits') this.refreshCredits();
  }

  refreshSummary(): void { this.load('summary', this.service.getSummary(), data => this.summary.set(data)); }
  refreshPayments(): void {
    const studentId = this.selectedStudentId;
    this.load('payments', this.service.getPayments(studentId || undefined), data => {
      if (this.selectedStudentId === studentId) this.payments.set(data);
    });
  }
  refreshCredits(): void {
    if (!this.selectedStudentId) return;
    const studentId = this.selectedStudentId;
    this.load('credits', this.service.getCreditBatches(studentId), data => {
      if (this.selectedStudentId === studentId) this.credits.set(data);
    });
  }
  refreshPlans(): void { this.load('plans', this.service.getInstallmentPlans(), data => this.plans.set(data)); }
  refreshProvider(): void { this.load('provider', this.service.getProviderPayments(), data => this.providerPayments.set(data)); }

  showForm(name: FormName): void {
    if (this.saving()) return;
    this.clearError('form');
    this.notice.set('');
    if (name !== 'installment' && !this.selectedStudentId) {
      this.setError('form', 'اختار الطالب أولاً لتسجيل العملية على حسابه.');
      return;
    }
    this.openForm.set(name);
  }

  closeForm(): void {
    if (this.saving()) return;
    this.openForm.set(null);
    this.activeInstallment.set(null);
    this.clearError('form');
  }

  newOperation(): void {
    if (this.saving()) return;
    const name = this.openForm();
    if (name === 'payment') {
      this.paymentForm.reset({ amount: 0, currency: 'EGP', paidAt: localDateTime(), purchasedCredits: 0 });
      this.operationKeys.payment.reset();
    } else if (name === 'plan') {
      this.planForm.reset({ scope: 'Term', totalAmount: 0, currency: 'EGP', downPaymentAmount: 0,
        installmentCount: 1, startDate: localDate(), firstDueDate: localDate() });
      this.operationKeys.plan.reset();
    } else if (name === 'installment') {
      this.installmentForm.reset({ amount: 0, currency: 'EGP', paidAt: localDateTime() });
      this.operationKeys.installment.reset();
    } else this.creditForm.reset({ credits: 1, validityDays: 30 });
    this.clearError('form');
  }

  submitPayment(): void {
    if (!this.valid(this.paymentForm) || !this.selectedStudentId) return;
    const value = this.paymentForm.getRawValue();
    const paidAt = this.isoTime(value.paidAt);
    if (!paidAt) return;
    const payload = {
      amount: value.amount, currency: value.currency.trim(), paymentMethod: value.paymentMethod.trim(),
      paymentReference: value.paymentReference.trim(), paidAt, notes: value.notes.trim(),
      purchasedCredits: value.purchasedCredits, purpose: value.purpose.trim(),
      ...(value.subjectId.trim() ? { subjectId: value.subjectId.trim() } : {}),
      ...(value.sessionId.trim() ? { sessionId: value.sessionId.trim() } : {}),
    };
    if (!payload.currency || !payload.paymentMethod || !payload.purpose) {
      this.setError('form', 'العملة وطريقة الدفع والغرض من الدفعة مطلوبة.'); return;
    }
    const signature = { studentId: this.selectedStudentId, ...payload };
    const body = { ...payload, idempotencyKey: this.operationKeys.payment.forPayload(signature) };
    this.save(this.service.recordPayment(this.selectedStudentId, body), 'payment', 'تم تسجيل دفعة الطالب بنجاح.', () => {
      this.refreshPayments(); this.refreshSummary();
    });
  }

  submitCredit(): void {
    if (this.creditNeedsReview()) return;
    if (!this.valid(this.creditForm) || !this.selectedStudentId) return;
    const body = this.creditForm.getRawValue();
    if (!body.description.trim()) { this.setError('form', 'اكتب وصفاً لإضافة الرصيد.'); return; }
    this.save(this.service.createCreditBatch(this.selectedStudentId, { ...body, description: body.description.trim() }),
      'credit', 'تمت إضافة رصيد الحصص بنجاح.', () => { this.refreshCredits(); this.refreshSummary(); });
  }

  submitPlan(): void {
    if (!this.valid(this.planForm) || !this.selectedStudentId) return;
    const value = this.planForm.getRawValue();
    if (value.downPaymentAmount > value.totalAmount) {
      this.setError('form', 'المقدم لا يمكن أن يتجاوز إجمالي الخطة.'); return;
    }
    if (value.firstDueDate < value.startDate) {
      this.setError('form', 'تاريخ أول استحقاق يجب أن يساوي تاريخ البداية أو يأتي بعده.'); return;
    }
    const payload = { ...value, studentId: this.selectedStudentId, currency: value.currency.trim(),
      paymentMethod: value.paymentMethod.trim(), paymentReference: value.paymentReference.trim() };
    if (!payload.currency || !payload.paymentMethod) { this.setError('form', 'العملة وطريقة الدفع مطلوبتان.'); return; }
    this.save(this.service.createInstallmentPlan({ ...payload, idempotencyKey: this.operationKeys.plan.forPayload(payload) }),
      'plan', 'تم إنشاء خطة الأقساط بنجاح.', () => { this.refreshPlans(); this.refreshSummary(); });
  }

  payInstallment(installment: FinanceRecord, planCurrency = ''): void {
    const id = this.text(installment, 'id', 'installmentId');
    if (!id || this.saving()) return;
    if (this.installmentContextId !== id) {
      this.installmentForm.reset({ amount: 0, currency: this.text(installment, 'currency') || planCurrency || 'EGP', paidAt: localDateTime() });
      this.installmentContextId = id;
    }
    this.activeInstallment.set(installment);
    this.showForm('installment');
  }

  submitInstallment(): void {
    if (!this.valid(this.installmentForm)) return;
    const id = this.text(this.activeInstallment(), 'id', 'installmentId');
    if (!id) return;
    const value = this.installmentForm.getRawValue();
    const paidAt = this.isoTime(value.paidAt);
    if (!paidAt) return;
    const payload = { ...value, currency: value.currency.trim(), paymentMethod: value.paymentMethod.trim(),
      paymentReference: value.paymentReference.trim(), notes: value.notes.trim(), paidAt };
    if (!payload.currency || !payload.paymentMethod) { this.setError('form', 'العملة وطريقة الدفع مطلوبتان.'); return; }
    const body = { ...payload, idempotencyKey: this.operationKeys.installment.forPayload({ id, ...payload }) };
    this.save(this.service.recordInstallmentPayment(id, body), 'installment', 'تم تسجيل سداد القسط بنجاح.', () => {
      this.refreshPlans(); this.refreshPayments(); this.refreshSummary();
    });
  }

  showProviderPayment(payment: FinanceRecord): void {
    const id = this.text(payment, 'id', 'paymentIntentId');
    if (!id) return;
    this.providerDetail.set(null);
    this.load('providerDetail', this.service.getProviderPayment(id), data => this.providerDetail.set(data));
  }

  text(record: unknown, ...keys: string[]): string {
    if (!isFinanceRecord(record)) return '';
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' || typeof value === 'number') return String(value);
    }
    return '';
  }

  date(record: FinanceRecord, ...keys: string[]): string {
    const value = this.text(record, ...keys);
    if (!value) return '—';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('ar-EG');
  }

  studentName(record: FinanceRecord): string {
    return this.text(record, 'studentName', 'studentFullName') ||
      this.students().find(student => student.id === this.text(record, 'studentId'))?.fullName || '—';
  }

  installments(plan: FinanceRecord): FinanceRecord[] {
    const items = plan['installments'];
    return Array.isArray(items) ? items.filter(isFinanceRecord) : [];
  }

  fields(value: unknown, prefix = ''): { label: string; value: string }[] {
    if (!isFinanceRecord(value)) return [];
    const labels: Record<string, string> = {
      id: 'المعرّف', studentId: 'معرّف الطالب', studentName: 'الطالب', totalStudents: 'إجمالي الطلاب',
      totalPayments: 'إجمالي المدفوعات', totalPaidAmount: 'إجمالي المبالغ المدفوعة', totalAmount: 'إجمالي المبلغ',
      totalCollected: 'المبالغ المحصلة', totalOutstanding: 'المبالغ المستحقة', outstandingAmount: 'المبلغ المستحق',
      paidAmount: 'المبلغ المدفوع', remainingAmount: 'المبلغ المتبقي', totalCredits: 'إجمالي الحصص',
      remainingCredits: 'الحصص المتبقية', consumedCredits: 'الحصص المستخدمة', totalCreditBalance: 'رصيد الحصص',
      totalRevenue: 'إجمالي الإيرادات', currency: 'العملة', amount: 'المبلغ', status: 'الحالة',
      paymentIntentId: 'معرّف عملية الدفع', paymentMethod: 'طريقة الدفع', paymentReference: 'مرجع الدفع',
      createdAt: 'تاريخ الإنشاء', paidAt: 'تاريخ الدفع', transactionId: 'رقم المعاملة',
      paymentUrl: 'رابط الدفع', purpose: 'الغرض', purchasedCredits: 'الحصص المشتراة',
      installmentCount: 'عدد الأقساط', totalInstallments: 'إجمالي الأقساط', overdueAmount: 'المبالغ المتأخرة',
      overdueInstallments: 'الأقساط المتأخرة', notes: 'ملاحظات', description: 'الوصف',
    };
    return Object.entries(value).flatMap(([key, item]) => {
      // Provider tokens and transaction keys are not needed in an administrative detail view.
      if (/token|key|secret/i.test(key)) return [];
      const label = `${prefix}${labels[key] || key.replace(/([A-Z])/g, ' $1')}`;
      if (item === null || item === undefined || Array.isArray(item)) return [];
      if (isFinanceRecord(item)) return prefix ? [] : this.fields(item, `${label} · `);
      if (typeof item === 'object') return [];
      return [{ label, value: typeof item === 'boolean' ? (item ? 'نعم' : 'لا') : String(item) }];
    });
  }

  private load<T>(key: string, request: Observable<T>, onSuccess: (data: T) => void): void {
    const generation = (this.loadGeneration[key] || 0) + 1;
    this.loadGeneration[key] = generation;
    this.loading.update(value => ({ ...value, [key]: true }));
    this.clearError(key);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        if (this.loadGeneration[key] !== generation) return;
        try { onSuccess(data); } catch (error) { this.setError(key, this.errorMessage(error)); }
        this.loading.update(value => ({ ...value, [key]: false }));
      },
      error: error => {
        if (this.loadGeneration[key] !== generation) return;
        this.loading.update(value => ({ ...value, [key]: false }));
        this.setError(key, this.errorMessage(error));
      },
    });
  }

  private save(request: Observable<unknown>, name: FormName, message: string, after: () => void): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.clearError('form');
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        if (name !== 'credit') this.operationKeys[name].reset();
        this.closeForm();
        this.notice.set(message);
        if (name === 'credit') { this.creditNeedsReview.set(false); this.creditForm.reset({ credits: 1, validityDays: 30 }); }
        else if (name === 'payment') this.paymentForm.reset({ amount: 0, currency: 'EGP', paidAt: localDateTime(), purchasedCredits: 0 });
        else if (name === 'plan') this.planForm.reset({ scope: 'Term', totalAmount: 0, currency: 'EGP', downPaymentAmount: 0,
          installmentCount: 1, startDate: localDate(), firstDueDate: localDate() });
        else if (name === 'installment') this.installmentContextId = '';
        after();
      },
      error: error => {
        this.saving.set(false);
        this.setError('form', this.errorMessage(error));
        if (name === 'credit' && isFinanceRecord(error) &&
          (error['status'] === 0 || (typeof error['status'] === 'number' && error['status'] >= 500))) {
          this.creditNeedsReview.set(true);
          this.refreshCredits();
          this.refreshSummary();
        }
      },
    });
  }

  private valid(form: { invalid: boolean; markAllAsTouched(): void }): boolean {
    if (this.saving()) return false;
    if (form.invalid) { form.markAllAsTouched(); this.setError('form', 'راجع الحقول المطلوبة والأرقام الموجبة وصيغة المعرّفات.'); return false; }
    return true;
  }
  private isoTime(value: string): string | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) { this.setError('form', 'أدخل تاريخ ووقت دفع صحيحين.'); return null; }
    return date.toISOString();
  }
  private errorMessage(error: unknown): string {
    if (isFinanceRecord(error)) {
      const body = error['error'];
      if (isFinanceRecord(body) && typeof body['message'] === 'string') return body['message'];
    }
    return error instanceof Error ? error.message : 'تعذر تحميل البيانات أو حفظ العملية. تحقق من الاتصال وصلاحيات الحساب ثم حاول مجدداً.';
  }
  private clearError(key: string): void { this.errors.update(value => ({ ...value, [key]: '' })); }
  private setError(key: string, message: string): void { this.errors.update(value => ({ ...value, [key]: message })); }
}
