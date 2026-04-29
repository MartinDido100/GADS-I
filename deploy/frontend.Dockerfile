# ── Build stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# El frontend habla con el backend a través del mismo origen (Nginx proxya /api)
ENV VITE_API_URL=/api
RUN npm run build

# ── Runtime: nginx sirviendo estáticos + reverse proxy a /api ──────────────
FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
