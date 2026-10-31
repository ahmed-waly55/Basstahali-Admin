import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map, Subject } from 'rxjs';
import { DirectoryPageChange, parseDirectoryPage } from '../../../../core/models/directory-page';
import { DirectoryPaginator } from '../../../../shared/components/directory-paginator/directory-paginator';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import { CreateModeratorRequest, ModeratorRecord, UpdateModeratorRequest } from '../../../../core/models/account';
import { Account } from '../../../../core/services/account';

@Component({
  selector: 'app-moderator',
  standalone: true,
  imports: [CommonModule, A11yModule, FormsModule, ReactiveFormsModule, DirectoryPaginator, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './moderator.html',
  styleUrl: './moderator.css',
})
export class Moderator implements OnInit {
  private fb = inject(FormBuilder);
  private moderatorService = inject(Account);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private searchChanges = new Subject<string>();
  private requestVersion = 0;

  isAddModalOpen = false;
  isEditModalOpen = false;
  hidePassword = true;
  isLoading = false;
  isSaving = false;
  deletingModeratorId: string | null = null;
  loadError = '';
  currentModeratorId: string | null = null;
  pageNumber = 1;
  pageSize = 20;
  totalCount: number | null = null;
  totalPages: number | null = null;
  hasPreviousPage = false;
  hasNextPage = false;
  serverPaged = true;
  searchTerm = '';
  private appliedSearch = '';
  private requestedSearch = '';
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

  get filteredModerators(): ModeratorRecord[] {
    if (this.serverPaged || !this.appliedSearch) return this.dataSource.data;
    const query = this.appliedSearch.toLocaleLowerCase();
    return this.dataSource.data.filter(row => [row.fullName, row.userName, row.phoneNumber].join(' ').toLocaleLowerCase().includes(query));
  }

  get visibleModerators(): ModeratorRecord[] {
    if (this.serverPaged) return this.dataSource.data;
    return this.filteredModerators.slice((this.pageNumber - 1) * this.pageSize, this.pageNumber * this.pageSize);
  }
  get paginatorCount(): number | null { return this.serverPaged ? this.totalCount : this.filteredModerators.length; }
  get paginatorPages(): number | null { return this.serverPaged ? this.totalPages : Math.ceil(this.filteredModerators.length / this.pageSize); }
  get canPrevious(): boolean { return this.serverPaged ? this.hasPreviousPage : this.pageNumber > 1; }
  get canNext(): boolean { return this.serverPaged ? this.hasNextPage : this.pageNumber < (this.paginatorPages ?? 0); }

  ngOnInit(): void {
    this.searchChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(query => {
      this.appliedSearch = query;
      this.pageNumber = 1;
      if (this.serverPaged) this.loadModerators();
      else this.cdr.markForCheck();
    });
    this.loadModerators();
  }

  search(value: string): void {
    this.searchTerm = value;
    const query = value.trim();
    if (query === this.requestedSearch) return;
    this.requestedSearch = query;
    this.requestVersion++;
    if (this.serverPaged) {
      this.pageNumber = 1;
      this.isLoading = true;
      this.clearDisplayedDirectory();
    }
    this.searchChanges.next(query);
  }

  changePage(event: DirectoryPageChange): void {
    if (this.isSaving || this.deletingModeratorId || this.isLoading) return;
    const sizeChanged = event.pageSize !== this.pageSize;
    this.pageSize = event.pageSize;
    this.pageNumber = sizeChanged ? 1 : event.pageNumber;
    if (this.serverPaged) this.loadModerators();
  }

  loadModerators(): void {
    const version = ++this.requestVersion;
    const requestedPage = this.pageNumber;
    const requestedSize = this.pageSize;
    this.isLoading = true;
    this.loadError = '';
    this.clearDisplayedDirectory();
    this.moderatorService.getModerators({ PageNumber: requestedPage, PageSize: requestedSize, ...(this.appliedSearch ? { Search: this.appliedSearch } : {}) }).pipe(
      map(response => parseDirectoryPage<ModeratorRecord>(response, requestedPage, requestedSize)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: page => {
        if (version !== this.requestVersion) return;
        this.isLoading = false;
        this.serverPaged = page.serverPaged;
        this.pageNumber = page.pageNumber;
        this.pageSize = page.pageSize;
        this.totalCount = page.totalCount;
        this.totalPages = page.totalPages;
        this.hasPreviousPage = page.hasPreviousPage;
        this.hasNextPage = page.hasNextPage;
        const lastPage = this.serverPaged && page.totalPages !== null ? Math.max(1, page.totalPages) : null;
        if (lastPage !== null && requestedPage > lastPage) {
          this.pageNumber = lastPage;
          this.loadModerators();
          return;
        }
        this.dataSource.data = page.items.map(row => ({ ...row, id: row.id || (row as any)._id }));
        if (!this.serverPaged) this.pageNumber = Math.min(this.pageNumber, Math.max(1, Math.ceil(this.filteredModerators.length / this.pageSize)));
        this.cdr.markForCheck();
      },
      error: error => {
        if (version !== this.requestVersion) return;
        this.isLoading = false;
        this.loadError = 'تعذر تحميل قائمة المشرفين. ' + (error?.error?.message || error?.message || 'تحقق من الاتصال وحاول مرة أخرى.');
        this.cdr.markForCheck();
      },
    });
  }

  // Old rows and totals belong to the last successful query, not a pending page/search.
  // Keep the requested page/size/search for retry, but never relabel old records with them.
  private clearDisplayedDirectory(): void {
    this.dataSource.data = [];
    this.totalCount = null;
    this.totalPages = null;
    this.hasPreviousPage = this.pageNumber > 1;
    this.hasNextPage = false;
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
        this.cdr.markForCheck();
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
        this.cdr.markForCheck();
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
        this.cdr.markForCheck();
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
        this.cdr.markForCheck();
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
          this.cdr.markForCheck();
          if (res?.success === false) {
            this.showError(res?.message || 'فشل في حذف المشرف');
            return;
          }
          void Swal.fire('تم الحذف', 'تم حذف المشرف بنجاح', 'success');
          this.loadModerators();
        },
        error: (err) => {
          this.deletingModeratorId = null;
          this.cdr.markForCheck();
          this.showError(err?.error?.message || 'فشل في حذف المشرف. لم يتم تغيير القائمة.');
        },
      });
    });
  }

  private showError(message: string): void {
    void Swal.fire('خطأ', message, 'error');
  }
}
