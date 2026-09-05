import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';

export const authLoadingInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. جلب التوكن من الـ LocalStorage (تأكد من اسم المفتاح لديك، مثلاً 'token')
  const token = localStorage.getItem('token');

  // 2. نسخ الـ Request وإضافة الهيدر إذا كان التوكن موجوداً
  let clonedReq = req;
  if (token) {
    clonedReq = req.clone({
      setHeaders: {
        'token': token // عدلها إلى 'Authorization': `Bearer ${token}` إذا كان السيرفر يطلبها هكذا
      }
    });
  }

  // 3. إظهار نافذة التحميل (Loading) باستخدام SweetAlert2
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

  // 4. تمرير الطلب وإغلاق الـ Loading فور اكتمال الطلب (سواء نجاح أو خطأ)
  return next(clonedReq).pipe(
    finalize(() => {
      Swal.close();
    })
  );
};
