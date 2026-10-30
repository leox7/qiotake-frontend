// Used by `ng build` (production). PLACEHOLDER: set these two addresses before you deploy.
//
// As written they are relative ("/api", ""), which works when the website and the backend share one
// address and the web server forwards /api and /uploads to the backend (the nginx in the Dockerfile does this).
// If the backend lives on its own address, write the full URLs instead, for example:
//   apiBaseUrl: 'https://api.your-domain.example/api',
//   imageBaseUrl: 'https://api.your-domain.example',
export const environment = {
  apiBaseUrl: '/api',
  imageBaseUrl: '',
};
