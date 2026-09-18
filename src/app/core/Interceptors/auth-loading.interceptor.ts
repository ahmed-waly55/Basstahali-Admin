import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';

export const authLoadingInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. استثناء مسارات معينة إذا كنت لا تريد إرسال التوكن إليها (مثل تسجيل الدخول)
  const isAuthRequest = req.url.includes('/auth/login');

  let token = localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  token = token.replace(/^Bearer\s+/i, '').trim();

  let clonedReq = req;

  // 2. إرسال الهيدر القياسي بالصيغة الصحيحة (Authorization: Bearer TOKEN)
  if (token && !isAuthRequest) {
    clonedReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`
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

  // 4. إغلاق الـ Loading بأمان دون إغلاق أي نافذة تنبيه جديدة
  return next(clonedReq).pipe(
    finalize(() => {
      // نتأكد فقط من إغلاق الـ Loading لو كانت نافذة الـ Loading هي المفتوحة حالياً
      if (Swal.isVisible() && Swal.isLoading()) {
        Swal.close();
      }
    })
  );
};
