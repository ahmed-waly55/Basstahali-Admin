import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);

  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');

  // المستخدم مسجل دخول بالفعل
  if (token && refreshToken) {
    return router.createUrlTree(['/home']);
  }

  // غير مسجل دخول
  return true;
};
