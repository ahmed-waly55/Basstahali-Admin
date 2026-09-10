import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, ViewChild, OnInit, ChangeDetectorRef, TemplateRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { Account } from '../../../../core/services/account';
import { CurriculumService } from '../../../../core/services/curriculum-service';

@Component({
  selector: 'app-teacher',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './teacher.html',
  styleUrl: './teacher.css',
})
export class Teacher implements OnInit, AfterViewInit {
  private teacherService = inject(Account);
  private curriculumService = inject(CurriculumService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);

  isLoading = false;
  isDeletedLoading = false;
  isEditing = false;
  currentTeacherId: string | null = null;
  selectedTeacher: any = null;

  subjectsList: any[] = [];
  curriculaList: any[] = [];
  gradeLevelsList: any[] = [];

  // أعمدة جدول المدرسين الحاليين
  displayedColumns: string[] = ['fullName', 'phoneNumber', 'status', 'actions'];
  // أعمدة جدول الحسابات المحذوفة
  archivedDisplayedColumns: string[] = ['fullName', 'phoneNumber', 'status', 'actions'];

  dataSource = new MatTableDataSource<any>([]);
  archivedDataSource = new MatTableDataSource<any>([]);

  @ViewChild('activePaginator') activePaginator!: MatPaginator;
  @ViewChild('archivedPaginator') archivedPaginator!: MatPaginator;
  @ViewChild('activeSort') activeSort!: MatSort;
  @ViewChild('archivedSort') archivedSort!: MatSort;

  @ViewChild('formDialogTemplate') formDialogTemplate!: TemplateRef<any>;
  @ViewChild('detailsDialogTemplate') detailsDialogTemplate!: TemplateRef<any>;

  dialogRef!: MatDialogRef<any>;

  teacherForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required]],
    phoneNumber: ['', [Validators.required]],
    whatsApp: [''],
    userName: [''],
    password: [''],
    status: ['Active'],
    defaultPerSessionRate: [0],
    defaultCurrency: ['EGP'],
    preferredPayoutMethod: [''],
    eWalletNumber: [''],
    instaPayIdentifier: [''],
    subjectIds: [[]],
    curriculumIds: [[]],
    stageRates: this.fb.array([])
  });

  ngOnInit() {
    this.loadDropdownData();
    this.loadTeachers();
    this.loadArchivedTeachers();
  }

  ngAfterViewInit() {
    this.setupActiveTableFeatures();
    this.setupArchivedTableFeatures();
  }

  private setupActiveTableFeatures() {
    if (this.activePaginator) this.dataSource.paginator = this.activePaginator;
    if (this.activeSort) this.dataSource.sort = this.activeSort;
  }

  private setupArchivedTableFeatures() {
    if (this.archivedPaginator) this.archivedDataSource.paginator = this.archivedPaginator;
    if (this.archivedSort) this.archivedDataSource.sort = this.archivedSort;
  }

  // فلترة والبحث السريع في الجداول
  applyFilter(event: Event, isArchived = false) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    if (isArchived) {
      this.archivedDataSource.filter = filterValue;
    } else {
      this.dataSource.filter = filterValue;
    }
  }

  loadDropdownData() {
    this.curriculumService.getCurriculums().subscribe({
      next: (res: any) => {
        this.curriculaList = Array.isArray(res) ? res : (res.data?.items || res.data || []);
      },
      error: (err) => console.error('Error loading curricula', err)
    });

    this.curriculumService.getSubjects().subscribe({
      next: (res: any) => {
        this.subjectsList = Array.isArray(res) ? res : (res.data?.items || res.data || []);
      },
      error: (err) => console.error('Error loading subjects', err)
    });

    this.curriculumService.getGradeLevels().subscribe({
      next: (res: any) => {
        this.gradeLevelsList = Array.isArray(res) ? res : (res.data?.items || res.data || []);
      },
      error: (err) => console.error('Error loading grade levels', err)
    });
  }

  // 1. جلب المدرسين النشطين
  loadTeachers(): void {
    this.isLoading = true;
    this.teacherService.getTeachers().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res.data?.items || res.data || []);
        this.dataSource.data = data;
        setTimeout(() => this.setupActiveTableFeatures());
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'خطأ في التحميل',
          text: err?.error?.message || 'فشل في جلب بيانات المدرسين',
          confirmButtonColor: '#4f46e5'
        });
      }
    });
  }

  // 2. جلب المدرسين المحذوفين / المؤرشفين من الإندبوينت الخاص بالسيرفيس
  loadArchivedTeachers(): void {
    this.isDeletedLoading = true;
    this.teacherService.getArchivedTeachers().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res.data?.items || res.data || []);
        this.archivedDataSource.data = data;
        setTimeout(() => this.setupArchivedTableFeatures());
        this.isDeletedLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isDeletedLoading = false;
        console.error('Error loading archived teachers', err);
      }
    });
  }

  // 3. فتح مودال الإضافة (Angular Material)
  openAddModal(): void {
    this.isEditing = false;
    this.currentTeacherId = null;
    this.teacherForm.reset({
      defaultCurrency: 'EGP',
      defaultPerSessionRate: 0,
      status: 'Active',
      subjectIds: [],
      curriculumIds: []
    });
    this.stageRatesControls.clear();

    this.dialogRef = this.dialog.open(this.formDialogTemplate, {
      width: '820px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      direction: 'rtl',
      panelClass: 'custom-material-dialog'
    });
  }

  // 4. فتح مودال التعديل (Angular Material)
  editTeacher(row: any): void {
    this.isEditing = true;
    this.currentTeacherId = row.id;

    const existingSubjectIds = row.subjects?.map((s: any) => s.id) || [];
    const existingCurriculumIds = row.curricula?.map((c: any) => c.id) || [];

    this.teacherForm.patchValue({
      fullName: row.fullName,
      phoneNumber: row.phoneNumber,
      whatsApp: row.whatsApp,
      userName: row.userName,
      status: row.status || 'Active',
      defaultPerSessionRate: row.defaultPerSessionRate ?? 0,
      defaultCurrency: row.defaultCurrency ?? 'EGP',
      preferredPayoutMethod: row.preferredPayoutMethod || '',
      eWalletNumber: row.eWalletNumber || '',
      instaPayIdentifier: row.instaPayIdentifier || '',
      subjectIds: existingSubjectIds,
      curriculumIds: existingCurriculumIds
    });

    this.stageRatesControls.clear();
    if (row.stageRates && row.stageRates.length > 0) {
      row.stageRates.forEach((sr: any) => this.addStageRate(sr));
    }

    this.dialogRef = this.dialog.open(this.formDialogTemplate, {
      width: '820px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      direction: 'rtl',
      panelClass: 'custom-material-dialog'
    });
  }

  // 5. فتح مودال التفاصيل (Angular Material)
  viewDetails(row: any): void {
    this.selectedTeacher = row;
    this.dialog.open(this.detailsDialogTemplate, {
      width: '720px',
      maxWidth: '95vw',
      direction: 'rtl',
      panelClass: 'custom-material-dialog'
    });
  }

  closeModal(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  selectAll(controlName: string, list: any[]) {
    this.teacherForm.get(controlName)?.setValue(list.map(i => i.id));
  }

  deselectAll(controlName: string) {
    this.teacherForm.get(controlName)?.setValue([]);
  }

  get stageRatesControls() {
    return this.teacherForm.get('stageRates') as FormArray;
  }

  addStageRate(rateData?: any) {
    this.stageRatesControls.push(this.fb.group({
      gradeLevelId: [rateData?.gradeLevelId || '', Validators.required],
      rate: [rateData?.rate || 0, Validators.required],
      currency: [rateData?.currency || 'EGP', Validators.required]
    }));
  }

  removeStageRate(index: number) {
    this.stageRatesControls.removeAt(index);
  }

  // حفظ المدرس (إضافة أو تعديل)
  submitTeacher(): void {
    if (this.teacherForm.invalid) {
      this.teacherForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'تنبيه',
        text: 'يرجى إدخال الحقول المطلوبة بشكل صحيح',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const payload = { ...this.teacherForm.value };
    this.isLoading = true;

    if (this.isEditing && this.currentTeacherId) {
      delete payload.userName;
      delete payload.password;

      this.teacherService.updateTeacher(this.currentTeacherId, payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          Swal.fire({
            icon: 'success',
            title: 'تم التعديل بنجاح!',
            text: res?.message || 'تم تحديث بيانات المدرس بنجاح',
            timer: 2000,
            showConfirmButton: false
          });
          this.closeModal();
          this.loadTeachers();
        },
        error: (err) => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'فشل التعديل',
            text: err?.error?.message || 'حدث خطأ أثناء تعديل بيانات المدرس',
            confirmButtonColor: '#4f46e5'
          });
        }
      });
    } else {
      delete payload.status;

      this.teacherService.createTeacher(payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          Swal.fire({
            icon: 'success',
            title: 'تمت الإضافة بنجاح!',
            text: res?.message || 'تم إضافة المدرس الجديد بنجاح',
            timer: 2000,
            showConfirmButton: false
          });
          this.closeModal();
          this.loadTeachers();
        },
        error: (err) => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'فشل الإضافة',
            text: err?.error?.message || 'حدث خطأ أثناء إضافة المدرس',
            confirmButtonColor: '#4f46e5'
          });
        }
      });
    }
  }

  // حذف المدرس
  deleteTeacher(id: string): void {
    Swal.fire({
      title: 'هل أنت متأكد من الحذف؟',
      text: 'سيتم أرشفة ونقل الحساب إلى قائمة الحسابات المحذوفة!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'نعم، حذف',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.teacherService.deleteTeacher(id).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'تم الحذف!',
              text: res?.message || 'تم حذف المدرس بنجاح ونقله إلى الأرشيف.',
              timer: 1500,
              showConfirmButton: false
            });
            this.loadTeachers();
            this.loadArchivedTeachers();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'خطأ في الحذف',
              text: err?.error?.message || 'فشل في حذف المدرس',
              confirmButtonColor: '#4f46e5'
            });
          }
        });
      }
    });
  }

  // استرجاع مدرس محذوف باستخدام دالة السيرفيس المباشرة: restoreTeacher
  restoreTeacher(id: string): void {
    Swal.fire({
      title: 'استرجاع الحساب',
      text: 'هل أنت متأكد من استرجاع هذا الحساب إلى قائمة المدرسين النشطين؟',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'نعم، استرجع الحساب',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.teacherService.restoreTeacher(id).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'تم الاسترجاع!',
              text: res?.message || 'تم استعادة حساب المدرس بنجاح',
              timer: 1500,
              showConfirmButton: false
            });
            this.loadTeachers();
            this.loadArchivedTeachers();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'خطأ',
              text: err?.error?.message || 'فشل في استرجاع الحساب',
              confirmButtonColor: '#4f46e5'
            });
          }
        });
      }
    });
  }
}
