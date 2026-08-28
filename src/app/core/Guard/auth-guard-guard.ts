import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');

  if (token && refreshToken) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
