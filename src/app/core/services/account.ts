import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Account {

  private http = inject(HttpClient);

  // دالة مساعدة لإنشاء الهيدر وجلب التوكن من الـ localStorage
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ==================== المشرفين (Moderators) ====================

  // جلب كل المشرفين
  getModerators(): Observable<any> {
    return this.http.get(`${environment.baseUrl}/api/v1/moderators`, { headers: this.getAuthHeaders() });
  }

  // إضافة مشرف جديد
  createModerator(payload: any): Observable<any> {
    return this.http.post(`${environment.baseUrl}/api/v1/moderators`, payload, { headers: this.getAuthHeaders() });
  }

  // حذف مشرف
  deleteModerator(id: string): Observable<any> {
    return this.http.delete(`${environment.baseUrl}/api/v1/moderators/${id}`, { headers: this.getAuthHeaders() });
  }


  // ==================== المدرسين (Teachers) ====================

  // جلب كل المدرسين
  getTeachers(): Observable<any> {
    return this.http.get(`${environment.baseUrl}/api/v1/teachers`, { headers: this.getAuthHeaders() });
  }

  // إضافة مدرس جديد
  createTeacher(payload: any): Observable<any> {
    return this.http.post(`${environment.baseUrl}/api/v1/teachers`, payload, { headers: this.getAuthHeaders() });
  }

  // جلب مدرس برقم المعرف (id)
  getTeacherById(id: string): Observable<any> {
    return this.http.get(`${environment.baseUrl}/api/v1/teachers/${id}`, { headers: this.getAuthHeaders() });
  }

  // تعديل بيانات مدرس
  updateTeacher(id: string, payload: any): Observable<any> {
    return this.http.put(`${environment.baseUrl}/api/v1/teachers/${id}`, payload, { headers: this.getAuthHeaders() });
  }

  // حذف مدرس
  deleteTeacher(id: string): Observable<any> {
    return this.http.delete(`${environment.baseUrl}/api/v1/teachers/${id}`, { headers: this.getAuthHeaders() });
  }

  // استرجاع مدرس محذوف (Restore)
  restoreTeacher(id: string): Observable<any> {
    return this.http.post(`${environment.baseUrl}/api/v1/teachers/${id}/restore`, {}, { headers: this.getAuthHeaders() });
  }

  // جلب السجلات المؤرشفة للمدرسين (Archived Records)
  getArchivedTeachers(): Observable<any> {
    return this.http.get(`${environment.baseUrl}/api/v1/archived-records/teachers`, { headers: this.getAuthHeaders() });
  }

}
