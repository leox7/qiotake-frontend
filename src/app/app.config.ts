import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
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
    ),
    // Makes the browser tab show "<Page> | QiotaKE" using the `title` written on each route.
    { provide: TitleStrategy, useClass: QiotaTitleStrategy },
    // HttpClient is Angular's tool for calling the backend; the interceptor adds the login token.
    provideHttpClient(withInterceptors([jwtInterceptor])),
  ],
};
