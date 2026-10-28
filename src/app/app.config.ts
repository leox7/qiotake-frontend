import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';

import { routes } from './app.routes';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { QiotaTitleStrategy } from './core/services/page-title.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // anchorScrolling: a link like /#how-it-works scrolls to the element with that id.
      // scrollPositionRestoration: a new page starts at the top.
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
      // Clicking "How it works" while already on /#how-it-works would do nothing (same address).
      // 'reload' makes the router handle the click again, so the page scrolls back to the section.
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
    // Makes the browser tab show "<Page> | QiotaKE" using the `title` written on each route.
    { provide: TitleStrategy, useClass: QiotaTitleStrategy },
    // HttpClient is Angular's tool for calling the backend. Interceptors run in this order:
    // jwtInterceptor (adds the token, refreshes on 401) is the outer one, errorInterceptor (toasts)
    // the inner one. So a 401 that the refresh fixes never reaches the error toasts.
    provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])),
  ],
};
