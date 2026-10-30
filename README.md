# QiotaKE frontend

QiotaKE is a website that helps **KCA University students in Nairobi find a place to live**. Students search homes, request a booking and pay the deposit with M-Pesa. Landlords add their homes and answer booking requests. Admins look after the whole system.

This folder is the **Angular** website. The server it talks to is the Spring Boot project in the sibling folder `accommodation-finder`.

Built with Angular 21 (standalone components only), plain CSS, no UI library, no Tailwind.

## Install and run

You need Node.js 22 or newer and the backend running on port 8080.

```bash
npm install     # downloads the packages (once)
ng serve        # starts the website
```

Open <http://localhost:4200>. The page reloads when you save a file.

(If `ng` is not found, use `npx ng serve`.)

### Where the backend address is set

The backend address lives in **`src/environments/`**, and nowhere else in the code:

| File | Used by | Address |
| --- | --- | --- |
| `environment.ts` | `ng serve`, `ng test`, development builds | `http://localhost:8080/api` |
| `environment.prod.ts` | production builds (`ng build`) | `/api` (a placeholder, see below) |

Each file has two values: `apiBaseUrl` (the API) and `imageBaseUrl` (listing photos, which the backend serves outside `/api`).

The backend only accepts requests from `http://localhost:4200` while you develop (its `app.cors.allowed-origin` setting).

## Useful commands

```bash
ng serve                                # development server
ng test                                 # unit tests (Vitest), add --watch=false to run once
ng build --configuration development    # build with source maps
ng build                                # production build (same as --configuration production)
```

## Build for production

```bash
ng build --configuration production
```

The finished website is in `dist/qiotake-frontend/browser`. Upload that folder to any web server.

Before you deploy, open `src/environments/environment.prod.ts` and check the two addresses:

- **Same address for website and backend** (what the Docker setup does): keep `apiBaseUrl: '/api'` and `imageBaseUrl: ''`. The web server must forward `/api` and `/uploads` to the backend.
- **Backend on its own address**: write the full URLs, for example `https://api.your-domain.example/api` and `https://api.your-domain.example`. Then set the backend's `app.cors.allowed-origin` to the website's address.

The production build has no source maps, hashes every file name and warns when the first download grows over 500 kB (it is about 310 kB now). Every page is lazy loaded: the browser only downloads a page's code when someone opens it.

The web server must send every unknown address to `index.html` (a page refresh on `/listings/3` has no such file). The nginx file in this folder does it.

### Run with Docker (optional)

The `Dockerfile` builds the website and serves it with nginx. `nginx.conf.template` does two jobs: it sends unknown addresses to `index.html`, and it forwards `/api` and `/uploads` to the backend.

```bash
docker build -t qiotake-frontend .
docker run -p 8081:80 -e BACKEND_URL=http://host.docker.internal:8080 qiotake-frontend
```

Open <http://localhost:8081>. `BACKEND_URL` is where the backend runs (here: on your own computer, port 8080).

There is also a `frontend` service in `../accommodation-finder/docker-compose.yml`:

```bash
cd ../accommodation-finder
docker compose up -d --build frontend
```

The backend itself is not part of that compose file, so start it as usual (port 8080).

## Folder structure

Everything is under `src/app`. The rule: **a feature never imports from another feature.** Only `core/` and `shared/` are shared.

```text
src/app
├── core/                  things the whole app uses, with no screen of their own
│   ├── guards/            authGuard (must be logged in), roleGuard (right role), guestGuard (not for logged-in people)
│   ├── interceptors/      jwt.interceptor adds the login token and refreshes it; error.interceptor shows error pop-ups
│   ├── models/            the shapes of the data the backend sends (Listing, Booking, Payment ...)
│   ├── services/          token storage, session (refresh and logout), who is logged in, toasts, page titles, API calls shared by several features
│   ├── pipes/             the `money` pipe
│   ├── utils/             small helper functions: format-date, format-money, status-tone, api-error, image-url, trap-focus ...
│   ├── validators/        form rules: Kenyan phone number, student email
│   └── config/            site-info.ts: the support email, phone, address and opening hours
├── shared/                reusable screen pieces
│   ├── components/        navbar, footer, logo, status-badge, listing-card, search-bar, skeleton, empty-state, error-message, confirm-dialog, pagination, toast, faq, contact ...
│   └── layout/            portal-layout: the sidebar page frame of the landlord and admin areas
├── features/              one folder per area of the website
│   ├── home/  auth/  listings/  bookings/  payments/  profile/  reports/  info/  errors/
│   ├── landlord/          the landlord portal
│   └── admin/             the admin portal
├── app.component.*        the page frame: navbar, the current page, footer, toasts
├── app.config.ts          app-wide settings (router, HTTP interceptors)
└── app.routes.ts          the main list of addresses
```

Inside a feature, each page has its own folder with `name.component.ts` (the code), `name.component.html` (the layout) and `name.component.css` (the looks). The feature's service (the code that calls the backend) sits next to them.

Global colours, spacing and fonts are CSS variables in `src/styles.css`. Use them, and never type a colour in a component:

- `--muted-strong` is the colour for small grey text (hints, labels, table sub text). It is dark enough to read.
- `--muted` is too light for text. Use it only for borders, icons and decoration.

## Roles and routes

There are three roles: `STUDENT`, `LANDLORD`, `ADMIN`. After login each role lands on its own home page.

| Address | Who | Page |
| --- | --- | --- |
| `/` | everyone | Home |
| `/listings`, `/listings/:id` | everyone | Browse homes, home details (students can request a booking) |
| `/faq`, `/contact`, `/terms`, `/privacy` | everyone | Information pages |
| `/login`, `/register`, `/verify-otp` | logged-out people only | Sign in (password, then 6 digit code by email) and register |
| `/bookings`, `/bookings/:id/pay` | student | My bookings, pay the deposit or rent |
| `/profile` | any logged-in user | My profile |
| `/landlord` | landlord | Dashboard (inside it: `listings`, `listings/new`, `listings/:id/edit`, `bookings`, `payments`, `notifications`, `reports`, `profile`) |
| `/admin` | admin | Overview (inside it: `users`, `listings`, `bookings`, `payments`, `audit-log`, `reports`, `profile`) |
| `/forbidden` | anyone | Shown when the role does not fit the page |
| anything else | anyone | Page not found |

A logged-out visitor who opens a protected page goes to `/login?returnUrl=...` and comes back after signing in.

### How login works

- The access token lives 10 minutes, in `sessionStorage`. The refresh token lives 7 days, in `localStorage`. Both go through `TokenStorageService` only.
- When a request gets a 401, the app refreshes the session once and repeats the request. The refresh token is only ever sent to `POST /auth/refresh` and `POST /auth/logout`, and each one works only once.
- The email goes from `/login` to `/verify-otp` inside the router state, never in the address. Passwords and codes are never stored or logged.

## Accessibility and responsive design

- Works from 360 px wide phones to 1440 px screens, with no sideways scrolling (only wide tables scroll inside their own card).
- Buttons and links are at least 44 px tall. Small grey text has at least 4.5 to 1 contrast.
- The whole site works with the keyboard. The first Tab stop is "Skip to main content", and dialogs keep the focus inside and give it back when they close.
- Spinners, shimmer and smooth scrolling stop when the device asks for reduced motion.

## Tests

```bash
ng test --watch=false
```

There are a few small tests for the Kenyan phone and student email validators, the status badge mapping, the token storage (including `clear()`), and the money and date helpers.
