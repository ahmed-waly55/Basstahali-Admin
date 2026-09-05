import { Component, inject, signal } from '@angular/core';
import { CurriculumService } from '../../core/services/curriculum-service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-curriculum',
  imports: [CommonModule,
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
    MatCheckboxModule],
  templateUrl: './curriculum.html',
  styleUrl: './curriculum.css',
})
export class Curriculum {
  private curriculumService = inject(CurriculumService);
  private fb = inject(FormBuilder);

  // Signals لتخزين البيانات
  curriculums = signal<any[]>([]);
  gradeLevels = signal<any[]>([]);
  subjects = signal<any[]>([]);

  // أعمدة الجداول
  curriculumColumns = ['nameAr', 'nameEn', 'code'];
  gradeLevelColumns = ['nameAr', 'nameEn', 'code', 'curriculum', 'sortOrder'];
  subjectColumns = ['nameAr', 'nameEn', 'code', 'isShared', 'actions'];

  // النماذج (Forms)
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
    this.loadAllData();
  }

  loadAllData() {
    this.loadCurriculums();
    this.loadGradeLevels();
    this.loadSubjects();
  }

  loadCurriculums() {
    this.curriculumService.getCurriculums().subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res.data?.items || res.data || res.items || []);
        this.curriculums.set(list);
      },
      error: (err) => console.error('Error loading curriculums', err)
    });
  }

  loadGradeLevels() {
    this.curriculumService.getGradeLevels().subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res.data?.items || res.data || res.items || []);
        this.gradeLevels.set(list);
      },
      error: (err) => console.error('Error loading grade levels', err)
    });
  }

  loadSubjects() {
    this.curriculumService.getSubjects().subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res.data?.items || res.data || res.items || []);
        this.subjects.set(list);
      },
      error: (err) => console.error('Error loading subjects', err)
    });
  }

  // حفظ منهج جديد
  onSaveCurriculum() {
    if (this.curriculumForm.invalid) {
      this.curriculumForm.markAllAsTouched();
      return;
    }
    this.curriculumService.createCurriculum(this.curriculumForm.value).subscribe({
      next: () => {
        Swal.fire('نجاح', 'تم إضافة المنهج بنجاح', 'success');
        this.curriculumForm.reset();
        this.loadCurriculums();
      },
      error: () => Swal.fire('خطأ', 'فشل إضافة المنهج', 'error')
    });
  }

  // حفظ مرحلة دراسية جديدة
  onSaveGradeLevel() {
    if (this.gradeLevelForm.invalid) {
      this.gradeLevelForm.markAllAsTouched();
      return;
    }
    this.curriculumService.createGradeLevel(this.gradeLevelForm.value).subscribe({
      next: () => {
        Swal.fire('نجاح', 'تم إضافة المرحلة الدراسية بنجاح', 'success');
        this.gradeLevelForm.reset({ sortOrder: 0 });
        this.loadGradeLevels();
      },
      error: () => Swal.fire('خطأ', 'فشل إضافة المرحلة الدراسية', 'error')
    });
  }

  // حفظ مادة دراسية جديدة
  onSaveSubject() {
    if (this.subjectForm.invalid) {
      this.subjectForm.markAllAsTouched();
      return;
    }
    this.curriculumService.createSubject(this.subjectForm.value).subscribe({
      next: () => {
        Swal.fire('نجاح', 'تم إضافة المادة الدراسية بنجاح', 'success');
        this.subjectForm.reset({ isShared: false, curriculumIds: [], gradeLevelIds: [] });
        this.loadSubjects();
      },
      error: () => Swal.fire('خطأ', 'فشل إضافة المادة الدراسية', 'error')
    });
  }
}
