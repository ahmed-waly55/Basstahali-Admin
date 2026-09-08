import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { User } from '../../core/services/user';

@Component({
  selector: 'app-teacher-forms',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './teacher-forms.html',
  styleUrl: './teacher-forms.css',
})
export class TeacherForms implements OnInit, OnDestroy {
  private _User = inject(User);
  private _dialog = inject(MatDialog);

  // مصفوفة لتخزين الاشتراكات وحذفها عند مغادرة الصفحة
  private subscriptions: Subscription = new Subscription();

  displayedColumns: string[] = ['fullName', 'email', 'whatsAppNumber', 'curriculumName', 'gradeLevelName', 'status', 'actions'];
  dataSource = new MatTableDataSource<any>([]);

  ngOnInit(): void {
    this.loadTeacherForms();
  }

  // 1. جلب الطلبات
  loadTeacherForms(): void {
    const sub = this._User.getTeacherForms().subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.dataSource.data = res.data;
        }
      },
      error: () => {
        this.showAlert('خطأ!', 'حدث خطأ أثناء جلب الطلبات', 'error');
      }
    });
    this.subscriptions.add(sub); // إضافة الاشتراك للمجموعة
  }

  // 2. الموافقة على الطلب
  approveForm(requestId: string): void {
    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: "تريد الموافقة على هذا الطلب!",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'نعم، موافقة',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        const sub = this._User.approveTeacherForm(requestId).subscribe({
          next: () => {
            this.showAlert('تم بنجاح!', 'تمت الموافقة على الطلب بنجاح', 'success');
            this.loadTeacherForms();
          },
          error: () => {
            this.showAlert('خطأ!', 'فشل في الموافقة على الطلب', 'error');
          }
        });
        this.subscriptions.add(sub);
      }
    });
  }

  // 3. رفض الطلب
  openRejectDialog(requestId: string): void {
    const dialogRef = this._dialog.open(RejectReasonDialogComponent, {
      width: '400px'
    });

    const dialogSub = dialogRef.afterClosed().subscribe((reason: string) => {
      if (reason) {
        const sub = this._User.rejectTeacherForm(requestId, reason).subscribe({
          next: () => {
            this.showAlert('تم بنجاح!', 'تم رفض الطلب بنجاح', 'success');
            this.loadTeacherForms();
          },
          error: () => {
            this.showAlert('خطأ!', 'فشل في رفض الطلب', 'error');
          }
        });
        this.subscriptions.add(sub);
      }
    });
    this.subscriptions.add(dialogSub);
  }

  private showAlert(title: string, text: string, icon: 'success' | 'error' | 'warning'): void {
    Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#3B82F6'
    });
  }

  // تنظيف الذاكرة وإلغاء تفعيل الاشتراكات عند مغادرة المكون (Component)
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}

// مكون نافذة سبب الرفض
@Component({
  selector: 'app-reject-reason-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title class="text-xl font-bold text-gray-800 mb-2">سبب الرفض</h2>
    <mat-dialog-content class="py-2">
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>أدخل سبب الرفض بالتفصيل</mat-label>
        <textarea matInput [(ngModel)]="reason" rows="4" placeholder="اكتب السبب هنا..."></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="space-x-2 space-x-reverse pt-2">
      <button mat-button (click)="onCancel()" class="text-gray-600 px-4 py-2">إلغاء</button>
      <button mat-flat-button class="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md" [disabled]="!reason" (click)="onConfirm()">تأكيد الرفض</button>
    </mat-dialog-actions>
  `
})
class RejectReasonDialogComponent {
  reason: string = '';
  private dialogRef = inject(MatDialogRef<RejectReasonDialogComponent>);

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close(this.reason);
  }
}
