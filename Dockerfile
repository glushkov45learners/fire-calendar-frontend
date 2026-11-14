# Static build served by nginx on :8080. The API is not proxied here: the hub's Caddy
# puts this container and the backend on one origin (/api/* -> api, the rest -> web).
FROM node:24-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Production always calls the real API on its own origin (contract 3).
ENV VITE_API_URL=/api/v1 VITE_USE_MOCKS=false
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 8080
