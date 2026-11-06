# Один образ: бэкенд на Ktor отдаёт API и собранный фронтенд.

FROM node:22-slim AS frontend
WORKDIR /app
RUN corepack enable
COPY typespec/openapi.yaml typespec/openapi.yaml
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml frontend/
WORKDIR /app/frontend
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm generate && pnpm exec vite build

FROM eclipse-temurin:21-jdk AS backend
WORKDIR /app
COPY backend/ ./
RUN ./gradlew --no-daemon :presentation:installDist

FROM eclipse-temurin:21-jre
RUN useradd --system --no-create-home --uid 10001 app
WORKDIR /app
COPY --from=backend /app/presentation/build/install/presentation/ ./
COPY --from=frontend /app/frontend/dist/ ./static/
ENV STATIC_DIR=/app/static PORT=8080
USER 10001
EXPOSE 8080
CMD ["bin/presentation"]
