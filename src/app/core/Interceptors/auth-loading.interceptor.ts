import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { RequestActivity } from '../services/request-activity';

// متغير خارجي لمنع تكرار فتح التنبيه إذا فشل أكثر من طلب في نفس اللحظة بـ 401
let isSessionExpiredAlertOpen = false;

export const authLoadingInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const activity = inject(RequestActivity);

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

  // Keep requests visible without interrupting the administrator's current task.
  activity.begin();

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthRequest) {
        for (const key of ['token','accessToken','refreshToken','user']) localStorage.removeItem(key);

        if (!isSessionExpiredAlertOpen) {
          isSessionExpiredAlertOpen = true;

          Swal.fire({
            icon: 'warning',
            title: 'انتهت الجلسة!',
            text: 'انتهت صلاحية الجلسة تسجيل الدخول، يرجى تسجيل الدخول مجدداً.',
            confirmButtonText: 'تسجيل الدخول',
            confirmButtonColor: '#6241a5',
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

    finalize(() => activity.end())
  );
};
