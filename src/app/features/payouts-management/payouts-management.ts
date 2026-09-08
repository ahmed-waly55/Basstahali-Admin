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

// أضف هذه الحقول في الـ Component لديك
  displayedColumns: string[] = ['teacherName', 'phone', 'subjects', 'rate', 'sessions', 'status', 'actions'];

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
  this.payoutsService.getTeacherPayouts().subscribe((response: any) => {
    if (response && response.success && response.data && response.data.items) {
      this.teacherPayouts.set(response.data.items);
      this.teachers.set(response.data.items);
    }
  });
}

  loadTeachers() {
    this.teacherService.getTeachers().subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res.data?.items || res.data || res.items || []);
        this.teachers.set(list);
      },
      error: (err) => {
        console.error('Error fetching teachers', err);
        Swal.fire('خطأ', 'حدث خطأ أثناء جلب قائمة المدرسين.', 'error');
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
      },
      error: () => Swal.fire('خطأ', 'فشل إنشاء فترة الصرف', 'error')
    });
  }

  onGeneratePeriod(periodId: string) {
    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'سيتم توليد المستحقات للفترة المحددة',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، قم بالتوليد',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.payoutsService.generatePayoutPeriod(periodId).subscribe({
          next: () => Swal.fire('تم!', 'تم توليد المستحقات بنجاح', 'success'),
          error: () => Swal.fire('خطأ', 'فشل عملية التوليد', 'error')
        });
      }
    });
  }

  onExecuteAction(payoutId: string, action: string) {
    Swal.fire({
      title: 'تأكيد الإجراء',
      text: `هل أنت متأكد من تنفيذ الإجراء (${action})؟`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'تأكيد',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.payoutsService.updatePayoutAction(payoutId, action).subscribe({
          next: () => {
            Swal.fire('تم!', `تم تنفيذ الإجراء (${action}) بنجاح`, 'success');
            this.loadTeacherPayouts();
          },
          error: () => Swal.fire('خطأ', 'فشل تنفيذ الإجراء', 'error')
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

  onDecideAdjustment(adjustmentId: string, status: string, approvedAmount: number, responseText: string) {
    this.payoutsService.decidePayoutAdjustment(adjustmentId, {
      status: status,
      approvedAmount: approvedAmount,
      adminResponse: responseText
    }).subscribe({
      next: () => {
        Swal.fire('نجاح', 'تم تسجيل القرار بنجاح', 'success');
        this.loadTeacherPayouts();
      },
      error: () => Swal.fire('خطأ', 'فشل تسجيل القرار', 'error')
    });
  }
}
