import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import { CreateModeratorRequest, ModeratorRecord, UpdateModeratorRequest } from '../../../../core/models/account';
import { Account } from '../../../../core/services/account';

@Component({
  selector: 'app-moderator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatPaginatorModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './moderator.html',
  styleUrl: './moderator.css',
})
export class Moderator implements OnInit {
  private fb = inject(FormBuilder);
  private moderatorService = inject(Account);

  isAddModalOpen = false;
  isEditModalOpen = false;
  hidePassword = true;
  isLoading = false;
  isSaving = false;
  deletingModeratorId: string | null = null;
  loadError = '';
  currentModeratorId: string | null = null;
  pageIndex = 0;
  pageSize = 5;
  dataSource = new MatTableDataSource<ModeratorRecord>([]);

  addForm = this.fb.nonNullable.group({
    userName: ['', Validators.required],
    fullName: ['', Validators.required],
    phoneNumber: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    fixedMonthlySalary: [0, [Validators.required, Validators.min(0)]],
    salaryCurrency: ['EGP', Validators.required],
  });

  // PUT accepts profile, status and salary fields only; credentials have their own flow.
  editForm = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    phoneNumber: ['', Validators.required],
    status: ['', Validators.required],
    fixedMonthlySalary: [0, [Validators.required, Validators.min(0)]],
    salaryCurrency: ['', Validators.required],
  });

  get visibleModerators(): ModeratorRecord[] {
    const start = this.pageIndex * this.pageSize;
    return this.dataSource.data.slice(start, start + this.pageSize);
  }

  ngOnInit(): void {
    this.loadModerators();
  }

  changePage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  loadModerators(): void {
    this.isLoading = true;
    this.loadError = '';
    this.moderatorService.getModerators().subscribe({
      next: (res) => {
        const rows = Array.isArray(res) ? res : (res?.data?.items ?? res?.data ?? res?.items);
        if (res?.success === false || !Array.isArray(rows)) {
          this.loadError = res?.message || 'تعذر تحميل قائمة المشرفين. حاول مرة أخرى.';
        } else {
          this.dataSource.data = rows.map(item => ({ ...item, id: item.id || item._id }));
          this.pageIndex = Math.min(this.pageIndex, Math.max(0, Math.ceil(rows.length / this.pageSize) - 1));
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'تعذر تحميل قائمة المشرفين. تحقق من الاتصال وحاول مرة أخرى.';
      },
    });
  }

  openAddModal(): void {
    this.addForm.reset();
    this.hidePassword = true;
    this.isAddModalOpen = true;
  }

  closeAddModal(): void {
    if (!this.isSaving) this.isAddModalOpen = false;
  }

  openEditModal(row: ModeratorRecord): void {
    if (!row.id) return;
    this.currentModeratorId = row.id;
    this.editForm.reset({
      fullName: row.fullName || '',
      phoneNumber: row.phoneNumber || '',
      status: row.status || '',
      fixedMonthlySalary: row.fixedMonthlySalary ?? 0,
      salaryCurrency: row.salaryCurrency || '',
    });
    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    if (this.isSaving) return;
    this.isEditModalOpen = false;
    this.currentModeratorId = null;
    this.editForm.reset();
  }

  submitAdd(): void {
    if (this.isSaving) return;
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const payload: CreateModeratorRequest = this.addForm.getRawValue();
    this.isSaving = true;
    this.moderatorService.createModerator(payload).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res?.success === false) {
          this.showError(res?.message || 'فشل في إضافة المشرف');
          return;
        }
        this.closeAddModal();
        void Swal.fire('تم بنجاح', 'تم إضافة المشرف الجديد بنجاح', 'success');
        this.loadModerators();
      },
      error: (err) => {
        this.isSaving = false;
        this.showError(err?.error?.message || 'فشل في إضافة المشرف. لم يتم حفظ البيانات.');
      },
    });
  }

  submitEdit(): void {
    if (this.isSaving) return;
    if (this.editForm.invalid || !this.currentModeratorId) {
      this.editForm.markAllAsTouched();
      return;
    }
    const payload: UpdateModeratorRequest = this.editForm.getRawValue();
    this.isSaving = true;
    this.moderatorService.updateModerator(this.currentModeratorId, payload).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res?.success === false) {
          this.showError(res?.message || 'فشل في تحديث بيانات المشرف');
          return;
        }
        this.closeEditModal();
        void Swal.fire('تم التعديل', 'تم تحديث بيانات المشرف بنجاح', 'success');
        this.loadModerators();
      },
      error: (err) => {
        this.isSaving = false;
        this.showError(err?.error?.message || 'فشل في تحديث بيانات المشرف. لم يتم حفظ التغييرات.');
      },
    });
  }

  deleteModerator(id: string): void {
    if (!id || this.deletingModeratorId || this.isSaving) return;
    void Swal.fire({
      title: 'هل أنت متأكد من حذف المشرف؟',
      text: 'سيتم حذف المشرف من القائمة بعد تأكيد الخادم.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#582b91',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
    }).then((result) => {
      if (!result.isConfirmed || this.deletingModeratorId) return;
      this.deletingModeratorId = id;
      this.moderatorService.deleteModerator(id).subscribe({
        next: (res) => {
          this.deletingModeratorId = null;
          if (res?.success === false) {
            this.showError(res?.message || 'فشل في حذف المشرف');
            return;
          }
          void Swal.fire('تم الحذف', 'تم حذف المشرف بنجاح', 'success');
          this.loadModerators();
        },
        error: (err) => {
          this.deletingModeratorId = null;
          this.showError(err?.error?.message || 'فشل في حذف المشرف. لم يتم تغيير القائمة.');
        },
      });
    });
  }

  private showError(message: string): void {
    void Swal.fire('خطأ', message, 'error');
  }
}
