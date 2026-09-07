import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Course, CoursesService } from '../../core/services/courses';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './courses.html',
  styleUrl: './courses.css',
})
export class Courses implements OnInit {
  private coursesService = inject(CoursesService);
  private fb = inject(FormBuilder);

  coursesData = signal<Course[]>([]);
  isLoading = signal<boolean>(false);
  searchTerm = signal<string>('');

  // Modal States
  isModalOpen = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  selectedCourseId = signal<string | null>(null);

  // Enrollment Modal States
  isEnrollModalOpen = signal<boolean>(false);
  selectedCourseForEnroll = signal<Course | null>(null);

  // Files for multipart/form-data
  selectedCoverFile: File | null = null;
  selectedIntroFile: File | null = null;

  // Course Form
  courseForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    currency: ['EGP', Validators.required],
    hours: [0, Validators.required],
    lessonCount: [0, Validators.required],
    durationWeeks: [0, Validators.required],
    shortDescription: ['', Validators.required],
    detailedDescription: [''],
    notes: [''],
    isPublished: [true]
  });

  // Enrollment Form
  enrollForm: FormGroup = this.fb.group({
    studentId: ['', Validators.required],
    pricePaid: [0, [Validators.required, Validators.min(0)]],
    currency: ['EGP', Validators.required],
    paymentMethod: ['Cash', Validators.required],
    paymentReference: ['']
  });

  filteredCourses = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.coursesData();
    if (!term) return list;
    return list.filter(c => c.name?.toLowerCase().includes(term) || c.shortDescription?.toLowerCase().includes(term));
  });

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.isLoading.set(true);
    this.coursesService.getCourses().subscribe({
      next: (res: any) => {
        const data = res?.data?.items || res?.data || res || [];
        this.coursesData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading courses', err);
        this.isLoading.set(false);
      }
    });
  }

  openAddModal(): void {
    this.isEditMode.set(false);
    this.selectedCourseId.set(null);
    this.selectedCoverFile = null;
    this.selectedIntroFile = null;
    this.courseForm.reset({ currency: 'EGP', isPublished: true, price: 0, hours: 0, lessonCount: 0, durationWeeks: 0 });
    this.isModalOpen.set(true);
  }

  openEditModal(course: Course): void {
    this.isEditMode.set(true);
    this.selectedCourseId.set(course.id || null);
    this.selectedCoverFile = null;
    this.selectedIntroFile = null;
    this.courseForm.patchValue(course);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  openEnrollModal(course: Course): void {
    this.selectedCourseForEnroll.set(course);
    this.enrollForm.reset({ currency: course.currency || 'EGP', pricePaid: course.price || 0, paymentMethod: 'Cash' });
    this.isEnrollModalOpen.set(true);
  }

  closeEnrollModal(): void {
    this.isEnrollModalOpen.set(false);
    this.selectedCourseForEnroll.set(null);
  }

  onCoverSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedCoverFile = event.target.files[0];
    }
  }

  onIntroFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedIntroFile = event.target.files[0];
    }
  }

  saveCourse(): void {
    if (this.courseForm.invalid) return;

    const formData = new FormData();
    const val = this.courseForm.value;

    Object.keys(val).forEach(key => {
      formData.append(key, val[key]);
    });

    if (this.selectedCoverFile) {
      formData.append('Cover', this.selectedCoverFile);
    }
    if (this.selectedIntroFile) {
      formData.append('IntroFile', this.selectedIntroFile);
    }

    this.isLoading.set(true);
    if (this.isEditMode() && this.selectedCourseId()) {
      this.coursesService.updateCourse(this.selectedCourseId()!, formData).subscribe({
        next: () => {
          this.loadCourses();
          this.closeModal();
        },
        error: (err) => {
          console.error('Error updating course', err);
          this.isLoading.set(false);
        }
      });
    } else {
      this.coursesService.createCourse(formData).subscribe({
        next: () => {
          this.loadCourses();
          this.closeModal();
        },
        error: (err) => {
          console.error('Error creating course', err);
          this.isLoading.set(false);
        }
      });
    }
  }

  submitEnrollment(): void {
    if (this.enrollForm.invalid || !this.selectedCourseForEnroll()?.id) return;

    const enrollmentData = {
      ...this.enrollForm.value,
      paidAt: new Date().toISOString(),
      schedules: []
    };

    this.isLoading.set(true);
    this.coursesService.enrollStudent(this.selectedCourseForEnroll()!.id!, enrollmentData).subscribe({
      next: () => {
        alert('تم تسجيل الطالب بنجاح في الكورس!');
        this.isLoading.set(false);
        this.closeEnrollModal();
      },
      error: (err) => {
        console.error('Error enrolling student', err);
        alert('حدث خطأ أثناء تسجيل الطالب.');
        this.isLoading.set(false);
      }
    });
  }

  deleteCourse(id: string): void {
    if (confirm('هل أنت متأكد من حذف هذا الكورس نهائياً؟')) {
      this.isLoading.set(true);
      this.coursesService.deleteCourse(id).subscribe({
        next: () => this.loadCourses(),
        error: (err) => {
          console.error('Error deleting course', err);
          this.isLoading.set(false);
        }
      });
    }
  }
}
