import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, throwError } from 'rxjs';
import Swal from 'sweetalert2';

// متغير خارجي لمنع تكرار فتح التنبيه إذا فشل أكثر من طلب في نفس اللحظة بـ 401
let isSessionExpiredAlertOpen = false;

export const authLoadingInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // 1. استثناء مسارات معينة (مثل تسجيل الدخول)
  const isAuthRequest = req.url.includes('/auth/login');

  let token = localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  token = token.replace(/^Bearer\s+/i, '').trim();

  let clonedReq = req;

  // 2. إرسال الهيدر القياسي بالصيغة الصحيحة (Authorization: Bearer TOKEN)
  if (token && !isAuthRequest) {
    clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // 3. إظهار الـ Loading
  Swal.fire({
    title: 'جاري المعالجة...',
    text: 'يرجى الانتظار قليلاً',
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthRequest) {
        localStorage.clear();

        if (!isSessionExpiredAlertOpen) {
          isSessionExpiredAlertOpen = true;

          Swal.fire({
            icon: 'warning',
            title: 'انتهت الجلسة!',
            text: 'انتهت صلاحية الجلسة تسجيل الدخول، يرجى تسجيل الدخول مجدداً.',
            confirmButtonText: 'تسجيل الدخول',
            confirmButtonColor: '#4f46e5',
            allowOutsideClick: false,
            allowEscapeKey: false
          }).then(() => {
            isSessionExpiredAlertOpen = false;
            router.navigate(['/login']);
          });
        }
      }

      return throwError(() => error);
    }),

    finalize(() => {
      if (Swal.isVisible() && Swal.isLoading()) {
        Swal.close();
      }
    })
  );
};
