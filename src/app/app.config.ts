import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { ThemeService } from './core/services/theme';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authLoadingInterceptor } from './core/Interceptors/auth-loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => inject(ThemeService).initialize()),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authLoadingInterceptor])),

    provideRouter(routes, withInMemoryScrolling({scrollPositionRestoration:"top"}))
  ]
};
