import { Component, inject, OnInit, signal } from '@angular/core';
import { ExpensesService } from '../../core/services/expenses-service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-expenses',
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
    MatTabsModule
  ],
  templateUrl: './expenses.html',
  styleUrl: './expenses.css',
})
export class Expenses implements OnInit {
  private expensesService = inject(ExpensesService);
  private fb = inject(FormBuilder);

  // Signals للبيانات
  expenses = signal<any[]>([]);

  // أعمدة جدول Material
  displayedColumns: string[] = ['category', 'amount', 'expenseDate', 'status'];

  // نموذج إضافة مصروف جديد (محدث ليشمل reference و description)
  expenseForm: FormGroup = this.fb.group({
    reference: ['', Validators.required],
    category: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    expenseDate: [new Date().toISOString().split('T')[0], Validators.required],
    description: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadExpensesReport();
  }

  // جلب تقرير المصروفات من الـ API: api/v1/reports/expenses
  loadExpensesReport() {
    this.expensesService.getExpenseReports().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.expenses.set(res.data);
        }
      },
      error: (err) => console.error('Error fetching expenses report', err)
    });
  }

  // إضافة مصروف جديد مع SweetAlert2
  onSubmitExpense() {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    this.expensesService.createOperatingExpense(this.expenseForm.value).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'تم بنجاح!',
          text: 'تم إضافة المصروف التشغيلي بنجاح',
          confirmButtonColor: '#4f46e5'
        });

        // إعادة تعيين النموذج مع الحفاظ على تاريخ اليوم
        this.expenseForm.reset({
          expenseDate: new Date().toISOString().split('T')[0],
          amount: 0
        });

        this.loadExpensesReport(); // تحديث الجدول تلقائياً
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'خطأ!',
          text: err.error?.message || 'حدث خطأ أثناء إضافة المصروف، يرجى المحاولة مرة أخرى.',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }
}
