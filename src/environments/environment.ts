// Used by `ng serve`, `ng build --configuration development` and `ng test`.
// The Spring Boot backend runs on port 8080.
// `ng build` (production) swaps this file for environment.prod.ts (see angular.json "fileReplacements").
export const environment = {
  apiBaseUrl: 'http://localhost:8080/api',
  // Listing photos are served by the backend outside /api (for example /uploads/listings/abc.jpg).
  imageBaseUrl: 'http://localhost:8080',
};
