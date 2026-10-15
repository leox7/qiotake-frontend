// Used by `ng serve` (development). The Spring Boot backend runs on port 8080.
export const environment = {
  apiBaseUrl: 'http://localhost:8080/api',
  // Listing photos are served by the backend outside /api (for example /uploads/listings/abc.jpg).
  imageBaseUrl: 'http://localhost:8080',
};
