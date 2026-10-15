import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { buildCourseFormData, Course, CoursesService } from '../../core/services/courses';
import { CurriculumService } from '../../core/services/curriculum-service';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './courses.html',
  styleUrl: './courses.css',
})
export class Courses implements OnInit {
  private coursesService = inject(CoursesService);
  private curriculumService = inject(CurriculumService);
  private fb = inject(FormBuilder);

  coursesData = signal<Course[]>([]);
  curriculums = signal<any[]>([]);
  gradeLevels = signal<any[]>([]);
  subjects = signal<any[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  modalError = signal('');
  successMessage = signal('');
  lookupError = signal('');
  searchTerm = signal('');
  isModalOpen = signal(false);
  isEditMode = signal(false);
  selectedCourseId = signal<string | null>(null);
  selectedCourse = signal<Course | null>(null);
  isEnrollModalOpen = signal(false);
  selectedCourseForEnroll = signal<Course | null>(null);
  selectedCoverFile: File | null = null;
  selectedIntroFile: File | null = null;

  courseForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    currency: ['EGP', Validators.required],
    hours: [0, [Validators.required, Validators.min(0)]],
    lessonCount: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    durationWeeks: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    shortDescription: ['', Validators.required],
    detailedDescription: [null],
    notes: [null],
    introContent: [null],
    images: [null],
    features: [null],
    curriculumId: ['', Validators.pattern(uuid)],
    gradeLevelId: ['', Validators.pattern(uuid)],
    subjectId: ['', Validators.pattern(uuid)],
    educationStageId: ['', Validators.pattern(uuid)],
    minimumAge: [null, [Validators.min(0), Validators.pattern(/^\d+$/)]],
    maximumAge: [null, [Validators.min(0), Validators.pattern(/^\d+$/)]],
    ageGroupLabel: [null],
    isPublished: [true]
  }, { validators: (form: AbstractControl) => {
    const min = form.get('minimumAge')?.value;
    const max = form.get('maximumAge')?.value;
    return min !== null && min !== '' && max !== null && max !== '' && Number(min) > Number(max)
      ? { ageRange: true } : null;
  } });

  enrollForm: FormGroup = this.fb.group({
    studentId: ['', [Validators.required, Validators.pattern(uuid)]],
    pricePaid: [0, [Validators.required, Validators.min(0)]],
    currency: ['EGP', Validators.required],
    paymentMethod: ['Cash', Validators.required],
    paymentReference: ['']
  });

  filteredCourses = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    return this.coursesData().filter(c => !term || c.name?.toLowerCase().includes(term) || c.shortDescription?.toLowerCase().includes(term));
  });

  ngOnInit(): void {
    this.loadCourses();
    this.loadLookups();
  }

  private list(response: any): any[] {
    const list = response?.data?.items ?? response?.data ?? response?.items ?? response;
    return Array.isArray(list) ? list : [];
  }

  private errorText(error: any, fallback: string): string {
    const body = error?.error ?? error;
    const errors = body?.errors;
    const details = errors && typeof errors === 'object'
      ? Object.values(errors).flat().filter(item => typeof item === 'string').join('، ') : '';
    return details || body?.message || body?.title || fallback;
  }

  private failed(response: any): boolean {
    return response?.success === false || response?.isSuccess === false || response?.succeeded === false;
  }

  private loadLookups(): void {
    const lookups = [
      { request: this.curriculumService.getCurriculums(), target: this.curriculums },
      { request: this.curriculumService.getGradeLevels(), target: this.gradeLevels },
      { request: this.curriculumService.getSubjects(), target: this.subjects }
    ];
    lookups.forEach(({ request, target }) => request.subscribe({
      next: response => {
        if (this.failed(response)) this.lookupError.set('تعذر تحميل بعض القوائم. يمكنك إدخال معرّف العنصر مباشرة.');
        else target.set(this.list(response));
      },
      error: () => this.lookupError.set('تعذر تحميل بعض القوائم. يمكنك إدخال معرّف العنصر مباشرة.')
    }));
  }

  loadCourses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.coursesService.getCourses().subscribe({
      next: response => {
        if (this.failed(response)) this.errorMessage.set(this.errorText(response, 'تعذر تحميل الكورسات.'));
        else this.coursesData.set(this.list(response));
        this.isLoading.set(false);
      },
      error: error => {
        this.errorMessage.set(this.errorText(error, 'تعذر تحميل الكورسات. حاول مرة أخرى.'));
        this.isLoading.set(false);
      }
    });
  }

  openAddModal(): void {
    this.isEditMode.set(false);
    this.selectedCourseId.set(null);
    this.selectedCourse.set(null);
    this.selectedCoverFile = null;
    this.selectedIntroFile = null;
    this.modalError.set('');
    this.courseForm.reset({ currency: 'EGP', isPublished: true, price: 0, hours: 0, lessonCount: 0, durationWeeks: 0 });
    this.isModalOpen.set(true);
  }

  openEditModal(course: Course): void {
    this.openAddModal();
    this.isEditMode.set(true);
    this.selectedCourseId.set(course.id || null);
    this.selectedCourse.set(course);
    this.courseForm.patchValue({
      ...course,
      images: Array.isArray(course.images) && course.images.every(value => typeof value === 'string') ? course.images.join('\n') : null,
      features: Array.isArray(course.features) && course.features.every(value => typeof value === 'string') ? course.features.join('\n') : null
    });
  }

  closeModal(): void {
    if (!this.isSaving()) this.isModalOpen.set(false);
  }

  openEnrollModal(course: Course): void {
    this.selectedCourseForEnroll.set(course);
    this.modalError.set('');
    this.enrollForm.reset({ currency: course.currency || 'EGP', pricePaid: course.price || 0, paymentMethod: 'Cash' });
    this.isEnrollModalOpen.set(true);
  }

  closeEnrollModal(): void {
    if (this.isSaving()) return;
    this.isEnrollModalOpen.set(false);
    this.selectedCourseForEnroll.set(null);
  }

  onCoverSelected(event: Event): void {
    this.selectedCoverFile = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  onIntroFileSelected(event: Event): void {
    this.selectedIntroFile = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  saveCourse(): void {
    this.courseForm.markAllAsTouched();
    if (this.courseForm.invalid || this.isSaving()) return;
    if (this.isEditMode() && !this.selectedCourseId()) {
      this.modalError.set('معرّف الكورس غير متاح. أعد تحميل القائمة قبل التعديل.');
      return;
    }
    const data = buildCourseFormData(this.courseForm.value, this.selectedCoverFile, this.selectedIntroFile);
    const request = this.isEditMode()
      ? this.coursesService.updateCourse(this.selectedCourseId()!, data)
      : this.coursesService.createCourse(data);
    this.isSaving.set(true);
    this.successMessage.set('');
    this.modalError.set('');
    request.subscribe({
      next: response => {
        this.isSaving.set(false);
        if (this.failed(response)) {
          this.modalError.set(this.errorText(response, 'تعذر حفظ الكورس.'));
          return;
        }
        this.successMessage.set('تم حفظ بيانات الكورس بنجاح.');
        this.closeModal();
        this.loadCourses();
      },
      error: error => {
        this.modalError.set(this.errorText(error, 'تعذر حفظ الكورس. راجع البيانات وحاول مرة أخرى.'));
        this.isSaving.set(false);
      }
    });
  }

  submitEnrollment(): void {
    this.enrollForm.markAllAsTouched();
    if (this.enrollForm.invalid || !this.selectedCourseForEnroll()?.id || this.isSaving()) return;
    const enrollmentData = { ...this.enrollForm.value, paidAt: new Date().toISOString(), schedules: [] };
    this.isSaving.set(true);
    this.successMessage.set('');
    this.modalError.set('');
    this.coursesService.enrollStudent(this.selectedCourseForEnroll()!.id!, enrollmentData).subscribe({
      next: response => {
        this.isSaving.set(false);
        if (this.failed(response)) {
          this.modalError.set(this.errorText(response, 'تعذر تسجيل الطالب.'));
          return;
        }
        this.successMessage.set('تم تسجيل الطالب بنجاح في الكورس.');
        this.closeEnrollModal();
      },
      error: error => {
        this.modalError.set(this.errorText(error, 'تعذر تسجيل الطالب. راجع البيانات وحاول مرة أخرى.'));
        this.isSaving.set(false);
      }
    });
  }

  deleteCourse(id: string): void {
    if (!id || this.isSaving() || !confirm('هل أنت متأكد من حذف هذا الكورس نهائياً؟')) return;
    this.isSaving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.coursesService.deleteCourse(id).subscribe({
      next: response => {
        this.isSaving.set(false);
        if (this.failed(response)) {
          this.errorMessage.set(this.errorText(response, 'تعذر حذف الكورس.'));
          return;
        }
        this.successMessage.set('تم حذف الكورس بنجاح.');
        this.loadCourses();
      },
      error: error => {
        this.errorMessage.set(this.errorText(error, 'تعذر حذف الكورس.'));
        this.isSaving.set(false);
      }
    });
  }
}
