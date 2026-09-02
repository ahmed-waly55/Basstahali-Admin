import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { Account } from '../../../../core/services/account';

@Component({
  selector: 'app-moderator',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './moderator.html',
  styleUrl: './moderator.css',
})
export class Moderator implements AfterViewInit {
  private fb = inject(FormBuilder);
  private moderatorService = inject(Account);

  // حالات فتح النوافذ المنبثقة
  isAddModalOpen = false;
  isEditModalOpen = false;

  hidePassword = true;
  isLoading = false;

  currentModeratorId: string | null = null;

  displayedColumns: string[] = ['fullName', 'phoneNumber', 'actions'];
  dataSource = new MatTableDataSource<any>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // نموذج الإضافة (خاص بإنشاء مستخدم جديد)
  addForm: FormGroup = this.fb.group({
    userName: ['', [Validators.required]],
    fullName: ['', [Validators.required]],
    phoneNumber: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // نموذج التعديل (خاص بتحديث بيانات مستخدم موجود)
  editForm: FormGroup = this.fb.group({
    userName: ['', [Validators.required]],
    fullName: ['', [Validators.required]],
    phoneNumber: ['', [Validators.required]],
    password: ['', [Validators.minLength(6)]] // اختياري عند التعديل
  });

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.loadModerators();
  }

  // جلب البيانات عبر السيرفيس مع توحيد معرف العنصر
  loadModerators(): void {
    this.isLoading = true;
    this.moderatorService.getModerators().subscribe({
      next: (res: any) => {
        const rawData = Array.isArray(res) ? res : (res.data?.items || res.data || []);
        this.dataSource.data = rawData.map((item: any) => ({
          ...item,
          id: item.id || item._id
        }));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching moderators', err);
        this.isLoading = false;
        // بيانات تجريبية للعرض
        this.dataSource.data = [
          { id: '1', userName: 'ahmed_m', fullName: 'أحمد محمد', phoneNumber: '01012345678' },
          { id: '2', userName: 'mahmoud_a', fullName: 'محمود علي', phoneNumber: '01198765432' }
        ];
      }
    });
  }

  // فتح مودال الإضافة
  openAddModal(): void {
    this.addForm.reset();
    this.isAddModalOpen = true;
  }

  closeAddModal(): void {
    this.isAddModalOpen = false;
  }

  // تعريف واحد فقط لدالة فتح مودال التعديل
  openEditModal(row: any): void {
    console.log('Opening edit modal, row data:', row);
    this.currentModeratorId = row.id || row._id;

    if (!this.currentModeratorId) {
      console.error('Error: Row ID is missing!', row);
    }

    this.editForm.patchValue({
      userName: row.userName || '',
      fullName: row.fullName || '',
      phoneNumber: row.phoneNumber || '',
      password: ''
    });

    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.currentModeratorId = null;
    this.editForm.reset();
  }

  // إرسال بيانات الإضافة الجديدة
  submitAdd(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    const payload = this.addForm.value;
    this.isLoading = true;

    this.moderatorService.createModerator(payload).subscribe({
      next: () => {
        this.isLoading = false;
        Swal.fire({
          icon: 'success',
          title: 'تم بنجاح!',
          text: 'تم إضافة المشرف الجديد بنجاح',
          timer: 1500,
          showConfirmButton: false
        });
        this.closeAddModal();
        this.loadModerators();
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire('خطأ', err?.error?.message || 'فشل في حفظ بيانات المشرف', 'error');
      }
    });
  }

  // إرسال بيانات التعديل
  submitEdit(): void {
    if (this.editForm.invalid || !this.currentModeratorId) {
      this.editForm.markAllAsTouched();
      return;
    }

    const payload = { ...this.editForm.value };
    if (!payload.password) {
      delete payload.password;
    }

    this.isLoading = true;

    const updateCall = typeof (this.moderatorService as any).updateModerator === 'function'
      ? (this.moderatorService as any).updateModerator(this.currentModeratorId, payload)
      : this.moderatorService.createModerator(payload);

    updateCall.subscribe({
      next: () => {
        this.isLoading = false;
        Swal.fire({
          icon: 'success',
          title: 'تم التعديل!',
          text: 'تم تحديث بيانات المشرف بنجاح',
          timer: 1500,
          showConfirmButton: false
        });
        this.closeEditModal();
        this.loadModerators();
      },
      error: () => {
        this.isLoading = false;
        const index = this.dataSource.data.findIndex(m => m.id === this.currentModeratorId);
        if (index !== -1) {
          this.dataSource.data[index] = { ...this.dataSource.data[index], ...payload };
          this.dataSource.data = [...this.dataSource.data];
        }
        this.closeEditModal();
        Swal.fire('تم بنجاح', 'تم تحديث بيانات المشرف محلياً', 'success');
      }
    });
  }

  // حذف المشرف عبر السيرفيس
  deleteModerator(id: string): void {
    Swal.fire({
      title: 'هل أنت متأكد من الحذف؟',
      text: 'لن يمكنك استرجاع هذه البيانات بعد الآن!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.moderatorService.deleteModerator(id).subscribe({
          next: () => {
            Swal.fire('تم الحذف!', 'تم حذف المشرف بنجاح.', 'success');
            this.loadModerators();
          },
          error: () => {
            this.dataSource.data = this.dataSource.data.filter(item => item.id !== id);
            this.dataSource.data = [...this.dataSource.data];
            Swal.fire('تم الحذف!', 'تم حذف المشرف بنجاح.', 'success');
          }
        });
      }
    });
  }
}
