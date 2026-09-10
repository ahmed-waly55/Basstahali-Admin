import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CurriculumService {

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // ==================== Curriculums (المناهج) ====================

  /** جلب قائمة المناهج الدراسية */
  getCurriculums(): Observable<any> {
    return this.http.get(`${environment.baseUrl}/api/v1/curriculums`, {
      headers: this.getAuthHeaders()
    });
  }

  /** إضافة منهج دراسي جديد */
  createCurriculum(data: { nameAr: string; nameEn: string; code: string }): Observable<any> {
    return this.http.post(`${environment.baseUrl}/api/v1/curricula`, data, {
      headers: this.getAuthHeaders()
    });
  }

  /** تعديل منهج دراسي */
  updateCurriculum(id: string, data: { nameAr: string; nameEn: string; code: string }): Observable<any> {
    return this.http.put(`${environment.baseUrl}/api/v1/curricula/${id}`, data, {
      headers: this.getAuthHeaders()
    });
  }

  /** حذف منهج دراسي */
  deleteCurriculum(id: string): Observable<any> {
    return this.http.delete(`${environment.baseUrl}/api/v1/curricula/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // ==================== Grade Levels (المراحل الدراسية) ====================

  /** جلب قائمة المراحل الدراسية */
  getGradeLevels(): Observable<any> {
    return this.http.get(`${environment.baseUrl}/api/v1/grade-levels`, {
      headers: this.getAuthHeaders()
    });
  }

  /** إضافة مرحلة دراسية جديدة */
  createGradeLevel(data: {
    nameAr: string;
    nameEn: string;
    code: string;
    curriculumId: string;
    sortOrder: number;
  }): Observable<any> {
    return this.http.post(`${environment.baseUrl}/api/v1/grade-levels`, data, {
      headers: this.getAuthHeaders()
    });
  }

  /** تعديل مرحلة دراسية */
  updateGradeLevel(id: string, data: {
    nameAr: string;
    nameEn: string;
    code: string;
    curriculumId: string;
    sortOrder: number;
  }): Observable<any> {
    return this.http.put(`${environment.baseUrl}/api/v1/grade-levels/${id}`, data, {
      headers: this.getAuthHeaders()
    });
  }

  /** حذف مرحلة دراسية */
  deleteGradeLevel(id: string): Observable<any> {
    return this.http.delete(`${environment.baseUrl}/api/v1/grade-levels/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // ==================== Subjects (المواد الدراسية) ====================

  /** جلب قائمة المواد الدراسية */
  getSubjects(): Observable<any> {
    return this.http.get(`${environment.baseUrl}/api/v1/subjects`, {
      headers: this.getAuthHeaders()
    });
  }

  /** إضافة مادة دراسية جديدة */
  createSubject(data: {
    nameAr: string;
    nameEn: string;
    code: string;
    isShared: boolean;
    curriculumIds: string[];
    gradeLevelIds: string[];
  }): Observable<any> {
    return this.http.post(`${environment.baseUrl}/api/v1/subjects`, data, {
      headers: this.getAuthHeaders()
    });
  }

  /** تعديل مادة دراسية */
  updateSubject(id: string, data: {
    nameAr: string;
    nameEn: string;
    code: string;
    isShared: boolean;
    curriculumIds: string[];
    gradeLevelIds: string[];
  }): Observable<any> {
    return this.http.put(`${environment.baseUrl}/api/v1/subjects/${id}`, data, {
      headers: this.getAuthHeaders()
    });
  }

  /** حذف مادة دراسية */
  deleteSubject(id: string): Observable<any> {
    return this.http.delete(`${environment.baseUrl}/api/v1/subjects/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

}
