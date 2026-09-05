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

  // ==================== Curriculums ====================

  /**
   * جلب قائمة المناهج الدراسية
   */
  getCurriculums(): Observable<any> {
    return this.http.get(`${environment.baseUrl}/api/v1/curriculums`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * إضافة منهج دراسي جديد
   * @param data { nameAr: string, nameEn: string, code: string }
   */
  createCurriculum(data: { nameAr: string; nameEn: string; code: string }): Observable<any> {
    return this.http.post(`${environment.baseUrl}/api/v1/curricula`, data, {
      headers: this.getAuthHeaders()
    });
  }

  // ==================== Subjects ====================

  /**
   * جلب قائمة المواد الدراسية
   */
  getSubjects(): Observable<any> {
    return this.http.get(`${environment.baseUrl}/api/v1/subjects`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * إضافة مادة دراسية جديدة
   * @param data { nameAr: string, nameEn: string, code: string, isShared: boolean, curriculumIds: string[], gradeLevelIds: string[] }
   */
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

  // ==================== Grade Levels ====================

  /**
   * جلب قائمة المراحل الدراسية
   */
  getGradeLevels(): Observable<any> {
    return this.http.get(`${environment.baseUrl}/api/v1/grade-levels`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * إضافة مرحلة دراسية جديدة
   * @param data { nameAr: string, nameEn: string, code: string, curriculumId: string, sortOrder: number }
   */
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

}
