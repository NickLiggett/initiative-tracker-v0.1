# Build stage: compile the app to static files.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Runtime stage: nginx serving those files. Nothing about the environment is baked in: the sign-in settings are written
# to config.js when the container starts (docker/40-runtime-config.sh), so one image serves any environment.
# /api is not handled here; whatever is in front (Caddy, in the Compose file in open5e-backend) sends it to the backend.
FROM nginx:1.27-alpine
COPY docker/default.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/security-headers.conf
COPY --chmod=755 docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
