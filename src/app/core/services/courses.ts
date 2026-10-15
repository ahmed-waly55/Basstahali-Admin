import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Course {
  id?: string;
  name: string;
  price: number;
  currency: string;
  hours: number;
  lessonCount: number;
  shortDescription: string;
  detailedDescription: string;
  durationWeeks: number;
  isPublished: boolean;
  gradeLevelId?: string;
  subjectId?: string;
  curriculumId?: string;
  educationStageId?: string;
  minimumAge?: number | null;
  maximumAge?: number | null;
  ageGroupLabel?: string;
  coverUrl?: string;
  introFileUrl?: string;
  introContent?: string;
  images?: string[];
  features?: string[];
  notes?: string;
}

/** Repeated multipart keys bind to the API's string arrays. Never stringify arrays or absent IDs. */
export function buildCourseFormData(values: Record<string, unknown>, cover: File | null, intro: File | null): FormData {
  const data = new FormData();
  const fields: Record<string, string> = {
    name: 'Name', price: 'Price', currency: 'Currency', hours: 'Hours', lessonCount: 'LessonCount',
    durationWeeks: 'DurationWeeks', shortDescription: 'ShortDescription', detailedDescription: 'DetailedDescription',
    introContent: 'IntroContent', notes: 'Notes', isPublished: 'IsPublished', gradeLevelId: 'GradeLevelId',
    subjectId: 'SubjectId', curriculumId: 'CurriculumId', educationStageId: 'EducationStageId',
    minimumAge: 'MinimumAge', maximumAge: 'MaximumAge', ageGroupLabel: 'AgeGroupLabel'
  };
  for (const [control, field] of Object.entries(fields)) {
    const value = values[control];
    if (value === null || value === undefined || (control.endsWith('Id') && value === '')) continue;
    data.append(field, String(value));
  }
  for (const [control, field] of [['images', 'Images'], ['features', 'Features']]) {
    const value = values[control];
    const entries = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\r?\n/) : [];
    entries.map(item => String(item).trim()).filter(Boolean).forEach(item => data.append(field, item));
  }
  if (cover) data.append('Cover', cover);
  if (intro) data.append('IntroFile', intro);
  return data;
}

@Injectable({
  providedIn: 'root',
})
export class CoursesService {
  private _HttpClient = inject(HttpClient);

  // دالة مساعدة لإنشاء الهيدر وإرسال التوكن المخزن مع دعم الـ FormData
  private getHeaders(isMultipart: boolean = false): HttpHeaders {
    const token = localStorage.getItem('token') || '';

    let headersConfig: { [key: string]: string } = {
      'Authorization': `Bearer ${token}`
    };

    // في حالة إرسال بيانات عادية نضع Content-Type، أما مع FormData فنتركه للمتصفح
    if (!isMultipart) {
      headersConfig['Content-Type'] = 'application/json';
    }

    return new HttpHeaders(headersConfig);
  }

  getCourses(): Observable<any> {
    return this._HttpClient.get(
      `${environment.baseUrl}/api/v1/courses`,
      { headers: this.getHeaders() }
    );
  }

  createCourse(formData: FormData): Observable<any> {
    return this._HttpClient.post(
      `${environment.baseUrl}/api/v1/courses`,
      formData,
      { headers: this.getHeaders(true) }
    );
  }

  updateCourse(id: string, formData: FormData): Observable<any> {
    return this._HttpClient.put(
      `${environment.baseUrl}/api/v1/courses/${id}`,
      formData,
      { headers: this.getHeaders(true) }
    );
  }

  deleteCourse(id: string): Observable<any> {
    return this._HttpClient.delete(
      `${environment.baseUrl}/api/v1/courses/${id}`,
      { headers: this.getHeaders() }
    );
  }

  enrollStudent(courseId: string, enrollmentData: any): Observable<any> {
    return this._HttpClient.post(
      `${environment.baseUrl}/api/v1/courses/${courseId}/enrollments`,
      enrollmentData,
      { headers: this.getHeaders() }
    );
  }

  deleteEnrollment(id: string): Observable<any> {
    return this._HttpClient.delete(
      `${environment.baseUrl}/api/v1/courses/enrollments/${id}`,
      { headers: this.getHeaders() }
    );
  }
}
