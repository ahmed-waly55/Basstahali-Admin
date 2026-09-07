import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

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
  coverUrl?: string;
  features?: string[];
  notes?: string;
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
