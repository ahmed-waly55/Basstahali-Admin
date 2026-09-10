import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { CurriculumService } from '../../core/services/curriculum-service';

@Component({
  selector: 'app-curriculum',
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
    MatTabsModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatSortModule,
    MatPaginatorModule
  ],
  templateUrl: './curriculum.html',
  styleUrl: './curriculum.css',
})
export class Curriculum implements OnInit, OnDestroy {
  private curriculumService = inject(CurriculumService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  private destroy$ = new Subject<void>();

  // Signals للقوائم المنسدلة
  curriculums = signal<any[]>([]);
  gradeLevels = signal<any[]>([]);
  subjects = signal<any[]>([]);

  // DataSources للجداول الثلاثة
  curriculumsDataSource = new MatTableDataSource<any>([]);
  gradeLevelsDataSource = new MatTableDataSource<any>([]);
  subjectsDataSource = new MatTableDataSource<any>([]);

  // ==================== حل مشكلة التابات مع Sort و Paginator ====================
  // استخدام Setters لضمان ربط الـ Paginator والـ Sort حتى لو كانت التابة مخفية وقت التشغيل
  @ViewChild('curriculumPaginator') set currPaginator(p: MatPaginator) {
    if (p) this.curriculumsDataSource.paginator = p;
  }
  @ViewChild('curriculumSort') set currSort(s: MatSort) {
    if (s) this.curriculumsDataSource.sort = s;
  }

  @ViewChild('gradeLevelPaginator') set gradePaginator(p: MatPaginator) {
    if (p) this.gradeLevelsDataSource.paginator = p;
  }
  @ViewChild('gradeLevelSort') set gradeSort(s: MatSort) {
    if (s) this.gradeLevelsDataSource.sort = s;
  }

  @ViewChild('subjectPaginator') set subPaginator(p: MatPaginator) {
    if (p) this.subjectsDataSource.paginator = p;
  }
  @ViewChild('subjectSort') set subSort(s: MatSort) {
    if (s) this.subjectsDataSource.sort = s;
  }

  // معرفات العناصر قيد التعديل
  editingCurriculumId = signal<string | null>(null);
  editingGradeLevelId = signal<string | null>(null);
  editingSubjectId = signal<string | null>(null);

  // أعمدة الجداول
  curriculumColumns = ['nameAr', 'nameEn', 'code', 'actions'];
  gradeLevelColumns = ['nameAr', 'nameEn', 'code', 'curriculum', 'sortOrder', 'actions'];
  subjectColumns = ['nameAr', 'nameEn', 'code', 'isShared', 'actions'];

  // النماذج
  curriculumForm: FormGroup = this.fb.group({
    nameAr: ['', Validators.required],
    nameEn: ['', Validators.required],
    code: ['', Validators.required]
  });

  gradeLevelForm: FormGroup = this.fb.group({
    nameAr: ['', Validators.required],
    nameEn: ['', Validators.required],
    code: ['', Validators.required],
    curriculumId: ['', Validators.required],
    sortOrder: [0, [Validators.required, Validators.min(0)]]
  });

  subjectForm: FormGroup = this.fb.group({
    nameAr: ['', Validators.required],
    nameEn: ['', Validators.required],
    code: ['', Validators.required],
    isShared: [false],
    curriculumIds: [[], Validators.required],
    gradeLevelIds: [[], Validators.required]
  });

  ngOnInit(): void {
    this.setupCustomFilterPredicates();
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== دوال SweetAlert المضمونة ====================
  private showSuccess(title: string, message: string) {
    Swal.fire({
      icon: 'success',
      title: title,
      text: message,
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true
    });
  }

  private showError(title: string, err: any, fallbackMessage: string) {
    const errorMsg = err?.error?.message || err?.error?.title || err?.message || fallbackMessage;
    Swal.fire({
      icon: 'error',
      title: title,
      text: errorMsg,
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#4f46e5'
    });
  }

  // ==================== تخصيص الفلترة للبحث باللغة العربية والإنجليزية ====================
  private setupCustomFilterPredicates() {
    this.curriculumsDataSource.filterPredicate = (data: any, filter: string) => {
      const searchStr = `${data.nameAr || ''} ${data.nameEn || ''} ${data.code || ''}`.toLowerCase();
      return searchStr.includes(filter);
    };

    this.gradeLevelsDataSource.filterPredicate = (data: any, filter: string) => {
      const currName = data.curriculumNameAr || data.curriculum?.nameAr || '';
      const searchStr = `${data.nameAr || ''} ${data.nameEn || ''} ${data.code || ''} ${currName}`.toLowerCase();
      return searchStr.includes(filter);
    };

    this.subjectsDataSource.filterPredicate = (data: any, filter: string) => {
      const searchStr = `${data.nameAr || ''} ${data.nameEn || ''} ${data.code || ''}`.toLowerCase();
      return searchStr.includes(filter);
    };
  }

  // دالة الفلترة الفورية
  applyFilter(event: Event, tableType: 'curriculum' | 'gradeLevel' | 'subject') {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();

    if (tableType === 'curriculum') {
      this.curriculumsDataSource.filter = filterValue;
      if (this.curriculumsDataSource.paginator) this.curriculumsDataSource.paginator.firstPage();
    } else if (tableType === 'gradeLevel') {
      this.gradeLevelsDataSource.filter = filterValue;
      if (this.gradeLevelsDataSource.paginator) this.gradeLevelsDataSource.paginator.firstPage();
    } else if (tableType === 'subject') {
      this.subjectsDataSource.filter = filterValue;
      if (this.subjectsDataSource.paginator) this.subjectsDataSource.paginator.firstPage();
    }
  }

  // دالة تحديد الكل (Select All)
  selectAll(controlName: string, itemsList: any[]) {
    const allIds = itemsList.map(item => item.id);
    this.subjectForm.get(controlName)?.setValue(allIds);
    this.subjectForm.get(controlName)?.markAsDirty();
  }

  // إلغاء تحديد الكل
  deselectAll(controlName: string) {
    this.subjectForm.get(controlName)?.setValue([]);
    this.subjectForm.get(controlName)?.markAsDirty();
  }

  loadAllData() {
    this.loadCurriculums();
    this.loadGradeLevels();
    this.loadSubjects();
  }

  // ==================== 1. المناهج الدراسية ====================

  loadCurriculums() {
    this.curriculumService.getCurriculums()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res) ? res : (res.data?.items || res.data || res.items || []);
          this.curriculums.set(list);
          this.curriculumsDataSource.data = list;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error loading curriculums', err)
      });
  }

  onSaveCurriculum() {
    if (this.curriculumForm.invalid) {
      this.curriculumForm.markAllAsTouched();
      return;
    }

    const val = this.curriculumForm.value;
    const editId = this.editingCurriculumId();

    if (editId) {
      this.curriculumService.updateCurriculum(editId, val)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('تم التعديل!', 'تم تحديث بيانات المنهج بنجاح');
            this.cancelEditCurriculum();
            this.loadCurriculums();
          },
          error: (err) => this.showError('فشل التعديل', err, 'حدث خطأ أثناء تعديل المنهج')
        });
    } else {
      this.curriculumService.createCurriculum(val)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('تمت الإضافة!', 'تم إضافة المنهج الدراسي بنجاح');
            this.curriculumForm.reset();
            this.loadCurriculums();
          },
          error: (err) => this.showError('فشل الإضافة', err, 'حدث خطأ أثناء إضافة المنهج')
        });
    }
  }

  editCurriculum(item: any) {
    this.editingCurriculumId.set(item.id);
    this.curriculumForm.patchValue({
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      code: item.code
    });
  }

  cancelEditCurriculum() {
    this.editingCurriculumId.set(null);
    this.curriculumForm.reset();
  }

  deleteCurriculum(id: string) {
    Swal.fire({
      title: 'هل أنت متأكد من الحذف؟',
      text: 'لن تتمكن من استرجاع هذا المنهج بعد حذفه!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.curriculumService.deleteCurriculum(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.showSuccess('تم الحذف!', 'تم حذف المنهج بنجاح');
              this.loadCurriculums();
            },
            error: (err) => this.showError('خطأ في الحذف', err, 'فشل حذف المنهج')
          });
      }
    });
  }

  // ==================== 2. المراحل الدراسية ====================

  loadGradeLevels() {
    this.curriculumService.getGradeLevels()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res) ? res : (res.data?.items || res.data || res.items || []);
          this.gradeLevels.set(list);
          this.gradeLevelsDataSource.data = list;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error loading grade levels', err)
      });
  }

  onSaveGradeLevel() {
    if (this.gradeLevelForm.invalid) {
      this.gradeLevelForm.markAllAsTouched();
      return;
    }

    const val = this.gradeLevelForm.value;
    const editId = this.editingGradeLevelId();

    if (editId) {
      this.curriculumService.updateGradeLevel(editId, val)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('تم التعديل!', 'تم تحديث بيانات المرحلة بنجاح');
            this.cancelEditGradeLevel();
            this.loadGradeLevels();
          },
          error: (err) => this.showError('فشل التعديل', err, 'حدث خطأ أثناء تعديل المرحلة')
        });
    } else {
      this.curriculumService.createGradeLevel(val)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('تمت الإضافة!', 'تم إضافة المرحلة الدراسية بنجاح');
            this.gradeLevelForm.reset({ sortOrder: 0 });
            this.loadGradeLevels();
          },
          error: (err) => this.showError('فشل الإضافة', err, 'حدث خطأ أثناء إضافة المرحلة')
        });
    }
  }

  editGradeLevel(item: any) {
    this.editingGradeLevelId.set(item.id);
    this.gradeLevelForm.patchValue({
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      code: item.code,
      curriculumId: item.curriculumId || item.curriculum?.id || '',
      sortOrder: item.sortOrder ?? 0
    });
  }

  cancelEditGradeLevel() {
    this.editingGradeLevelId.set(null);
    this.gradeLevelForm.reset({ sortOrder: 0 });
  }

  deleteGradeLevel(id: string) {
    Swal.fire({
      title: 'هل أنت متأكد من الحذف؟',
      text: 'سيتم حذف هذه المرحلة الدراسية بشكل نهائي!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.curriculumService.deleteGradeLevel(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.showSuccess('تم الحذف!', 'تم حذف المرحلة بنجاح');
              this.loadGradeLevels();
            },
            error: (err) => this.showError('خطأ في الحذف', err, 'فشل حذف المرحلة الدراسية')
          });
      }
    });
  }

  // ==================== 3. المواد الدراسية ====================

  loadSubjects() {
    this.curriculumService.getSubjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res) ? res : (res.data?.items || res.data || res.items || []);
          this.subjects.set(list);
          this.subjectsDataSource.data = list;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error loading subjects', err)
      });
  }

  onSaveSubject() {
    if (this.subjectForm.invalid) {
      this.subjectForm.markAllAsTouched();
      return;
    }

    const val = this.subjectForm.value;
    const editId = this.editingSubjectId();

    if (editId) {
      this.curriculumService.updateSubject(editId, val)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('تم التعديل!', 'تم تحديث المادة الدراسية بنجاح');
            this.cancelEditSubject();
            this.loadSubjects();
          },
          error: (err) => this.showError('فشل التعديل', err, 'حدث خطأ أثناء تعديل المادة')
        });
    } else {
      this.curriculumService.createSubject(val)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('تمت الإضافة!', 'تم إضافة المادة الدراسية بنجاح');
            this.subjectForm.reset({ isShared: false, curriculumIds: [], gradeLevelIds: [] });
            this.loadSubjects();
          },
          error: (err) => this.showError('فشل الإضافة', err, 'حدث خطأ أثناء إضافة المادة')
        });
    }
  }

  editSubject(item: any) {
    this.editingSubjectId.set(item.id);

    const currIds = item.curriculumIds || item.curricula?.map((c: any) => c.id) || [];
    const gradeIds = item.gradeLevelIds || item.gradeLevels?.map((g: any) => g.id) || [];

    this.subjectForm.patchValue({
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      code: item.code,
      isShared: item.isShared ?? false,
      curriculumIds: currIds,
      gradeLevelIds: gradeIds
    });
  }

  cancelEditSubject() {
    this.editingSubjectId.set(null);
    this.subjectForm.reset({ isShared: false, curriculumIds: [], gradeLevelIds: [] });
  }

  deleteSubject(id: string) {
    Swal.fire({
      title: 'هل أنت متأكد من الحذف؟',
      text: 'سيتم حذف هذه المادة الدراسية نهائياً!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.curriculumService.deleteSubject(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.showSuccess('تم الحذف!', 'تم حذف المادة بنجاح');
              this.loadSubjects();
            },
            error: (err) => this.showError('خطأ في الحذف', err, 'فشل حذف المادة الدراسية')
          });
      }
    });
  }
}
