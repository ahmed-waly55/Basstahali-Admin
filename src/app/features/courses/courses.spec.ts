import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCourseFormData, Course, CoursesService } from '../../core/services/courses';
import { CurriculumService } from '../../core/services/curriculum-service';
import { Courses } from './courses';

describe('Course admin multipart contract', () => {
  it('uses documented keys, repeated arrays, and preserves zero and false values', () => {
    const cover = new File(['cover'], 'cover.png', { type: 'image/png' });
    const data = buildCourseFormData({
      name: 'رياضيات', price: 0, isPublished: false, minimumAge: 0, maximumAge: 12,
      educationStageId: 'a485e741-c148-4b49-b18f-f0628f4674c4',
      images: 'https://example.com/one.png\nhttps://example.com/two.png',
      features: ['متابعة', 'تمارين'], subjectId: '', gradeLevelId: null,
      introContent: 'مقدمة البرنامج'
    }, cover, null);
    expect(data.getAll('Images')).toEqual(['https://example.com/one.png', 'https://example.com/two.png']);
    expect(data.getAll('Features')).toEqual(['متابعة', 'تمارين']);
    expect(data.get('MinimumAge')).toBe('0');
    expect(data.get('IsPublished')).toBe('false');
    expect(data.get('IntroContent')).toBe('مقدمة البرنامج');
    expect(data.get('EducationStageId')).toBe('a485e741-c148-4b49-b18f-f0628f4674c4');
    expect(data.has('SubjectId')).toBe(false);
    expect(data.has('GradeLevelId')).toBe(false);
    expect(data.get('Cover')).toBeInstanceOf(File);
    expect(data.has('IntroFile')).toBe(false);
  });
});

describe('Courses admin editing', () => {
  let component: Courses;
  const service = {
    updateCourse: vi.fn(), createCourse: vi.fn(), getCourses: vi.fn(() => of([])),
    enrollStudent: vi.fn(), deleteCourse: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [
      { provide: CoursesService, useValue: service },
      { provide: CurriculumService, useValue: {} }
    ] });
    component = TestBed.runInInjectionContext(() => new Courses());
  });

  const course: Course = {
    id: 'a485e741-c148-4b49-b18f-f0628f4674c4', name: 'رياضيات', price: 100,
    currency: 'EGP', hours: 10, lessonCount: 5, shortDescription: 'وصف', detailedDescription: 'تفاصيل',
    durationWeeks: 4, isPublished: false, notes: 'ملاحظات',
    features: ['تدريب'], images: ['https://example.com/course.png'], introContent: 'مقدمة',
    educationStageId: 'a485e741-c148-4b49-b18f-f0628f4674c4', minimumAge: 6, maximumAge: 10
  };

  it('resubmits existing editable media metadata without replacing uploads', () => {
    service.updateCourse.mockReturnValue(of({ success: true }));
    component.openEditModal(course);
    component.saveCourse();
    const data: FormData = service.updateCourse.mock.calls[0][1];
    expect(data.getAll('Features')).toEqual(['تدريب']);
    expect(data.getAll('Images')).toEqual(course.images);
    expect(data.get('IntroContent')).toBe('مقدمة');
    expect(data.get('Notes')).toBe('ملاحظات');
    expect(data.has('Cover')).toBe(false);
    expect(data.has('IntroFile')).toBe(false);
  });

  it('resets optional values when a different course has no corresponding values', () => {
    component.openEditModal(course);
    const other = { ...course, id: 'different' };
    delete other.educationStageId;
    delete other.features;
    delete other.images;
    delete other.minimumAge;
    delete other.maximumAge;
    component.openEditModal(other);
    expect(component.courseForm.value.educationStageId).toBeNull();
    expect(component.courseForm.value.features).toBeNull();
    expect(component.courseForm.value.minimumAge).toBeNull();
  });

  it('blocks invalid age ranges before requesting a mutation', () => {
    component.openEditModal(course);
    component.courseForm.patchValue({ minimumAge: 12, maximumAge: 6 });
    component.saveCourse();
    expect(component.courseForm.hasError('ageRange')).toBe(true);
    expect(service.updateCourse.mock.calls.length).toBe(0);
  });

  it('keeps the form open when a 200 response reports failure', () => {
    service.updateCourse.mockReturnValue(of({ success: false, message: 'تعذر الحفظ' }));
    component.openEditModal(course);
    component.saveCourse();
    expect(component.isModalOpen()).toBe(true);
    expect(component.modalError()).toBe('تعذر الحفظ');
    expect(component.isSaving()).toBe(false);
  });
});
