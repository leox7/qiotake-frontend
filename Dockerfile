# Builds the Angular app and serves it with nginx.
#   docker build -t qiotake-frontend .
#   docker run -p 8081:80 -e BACKEND_URL=http://host.docker.internal:8080 qiotake-frontend

# ---------- Step 1: build the website ----------
FROM node:22-alpine AS build
WORKDIR /app

# Copy only the package files first, so Docker can reuse the installed packages when only the code changed
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Production build (uses src/environments/environment.prod.ts). The files end up in dist/qiotake-frontend/browser
RUN npx ng build --configuration production

# ---------- Step 2: serve it with nginx ----------
FROM nginx:1.27-alpine

# Files in /etc/nginx/templates/*.template are filled in at start-up: ${BACKEND_URL} becomes the real address
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/qiotake-frontend/browser /usr/share/nginx/html

# Where /api and /uploads are forwarded to. Change it with -e BACKEND_URL=... (see docker-compose.yml)
ENV BACKEND_URL=http://host.docker.internal:8080

EXPOSE 80
