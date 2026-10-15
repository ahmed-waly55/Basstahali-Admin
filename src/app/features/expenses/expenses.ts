import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';
import { ExpensesService } from '../../core/services/expenses-service';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './expenses.html',
  styleUrl: './expenses.css',
})
export class Expenses implements OnInit {
  private service = inject(ExpensesService);
  private fb = inject(FormBuilder);
  expenses = signal<any[]>([]);
  loading = signal(false);
  pending = signal(false);
  error = signal('');
  editId = signal<string | null>(null);
  expenseForm = this.fb.nonNullable.group({
    reference: ['', Validators.required],
    category: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    expenseDate: [new Date().toISOString().slice(0, 10), Validators.required],
    description: ['', Validators.required]
  });

  ngOnInit(): void { this.loadExpensesReport(); }

  // Management requires resource IDs; aggregate reports are not editable resource lists.
  loadExpensesReport(): void {
    this.loading.set(true);
    this.error.set('');
    this.service.getOperatingExpenses().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res?.success === false) { this.error.set(res.message || 'تعذر تحميل المصروفات'); return; }
        const data = res?.data ?? res;
        const rows = data?.items ?? data;
        if (!Array.isArray(rows)) { this.error.set('استجابة قائمة المصروفات غير متوقعة'); return; }
        this.expenses.set(rows);
      },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.message || 'تعذر تحميل المصروفات. أعد المحاولة.'); }
    });
  }

  editExpense(item: any): void {
    if (!item.id || this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    this.service.getOperatingExpense(item.id).subscribe({
      next: (res) => {
        this.pending.set(false);
        if (res?.success === false) { this.error.set(res.message || 'تعذر تحميل تفاصيل المصروف'); return; }
        const expense = res?.data ?? res;
        this.editId.set(item.id);
        this.expenseForm.setValue({
          reference: expense.reference ?? '', category: expense.category ?? '',
          amount: Number(expense.amount ?? 0), expenseDate: (expense.expenseDate ?? '').slice(0, 10),
          description: expense.description ?? ''
        });
        document.getElementById('expense-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      error: (err) => { this.pending.set(false); this.error.set(err?.error?.message || 'تعذر تحميل تفاصيل المصروف'); }
    });
  }

  cancelEdit(): void {
    this.editId.set(null);
    this.expenseForm.reset({ expenseDate: new Date().toISOString().slice(0, 10), amount: 0 });
  }

  async onSubmitExpense(): Promise<void> {
    if (this.pending()) return;
    if (this.expenseForm.invalid) { this.expenseForm.markAllAsTouched(); return; }
    const confirmed = await Swal.fire({
      title: this.editId() ? 'حفظ تعديل المصروف؟' : 'إضافة مصروف جديد؟',
      text: 'سيتم تسجيل البيانات المالية على النظام.', icon: 'question',
      showCancelButton: true, confirmButtonText: 'تأكيد الحفظ', cancelButtonText: 'إلغاء', confirmButtonColor: '#542394'
    });
    if (!confirmed.isConfirmed || this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    const request = this.editId()
      ? this.service.updateOperatingExpense(this.editId()!, this.expenseForm.getRawValue())
      : this.service.createOperatingExpense(this.expenseForm.getRawValue());
    request.subscribe({
      next: (res) => {
        this.pending.set(false);
        if (res?.success === false) { this.error.set(res.message || 'تعذر حفظ المصروف'); return; }
        this.cancelEdit();
        this.loadExpensesReport();
        void Swal.fire('تم الحفظ', 'تم حفظ بيانات المصروف بنجاح', 'success');
      },
      error: (err) => { this.pending.set(false); this.error.set(err?.error?.message || 'تعذر حفظ المصروف. بياناتك محفوظة لإعادة المحاولة.'); }
    });
  }

  async deleteExpense(item: any): Promise<void> {
    if (!item.id || this.pending()) return;
    const result = await Swal.fire({ title: 'حذف المصروف؟', text: 'سيتم حذف المصروف المحدد. تأكد من اختيار السجل الصحيح.',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'حذف المصروف', cancelButtonText: 'إلغاء', confirmButtonColor: '#b42318' });
    if (!result.isConfirmed || this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    this.service.deleteOperatingExpense(item.id).subscribe({
      next: (res) => {
        this.pending.set(false);
        if (res?.success === false) { this.error.set(res.message || 'تعذر حذف المصروف'); return; }
        if (this.editId() === item.id) this.cancelEdit();
        this.loadExpensesReport();
      },
      error: (err) => { this.pending.set(false); this.error.set(err?.error?.message || 'تعذر حذف المصروف'); }
    });
  }
}
