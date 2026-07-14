FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN npm ci

FROM dependencies AS build
ARG BACKEND_INTERNAL_URL=http://127.0.0.1:7001
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL
COPY frontend frontend
COPY backend backend
RUN npm run build --workspaces

FROM node:24-alpine AS backend-dependencies
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN npm ci --omit=dev --workspace backend

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
ENV FRONTEND_PORT=3000
ENV BACKEND_PORT=7001
ENV DATABASE_PATH=/app/backend/data/course-demo.sqlite
WORKDIR /app

COPY --from=backend-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/frontend/.next/standalone/node_modules ./node_modules
COPY --from=build --chown=node:node /app/frontend/.next/standalone/frontend ./frontend
COPY --from=build --chown=node:node /app/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
COPY --chown=node:node backend/package.json backend/bootstrap.js ./backend/
COPY --chown=node:node infra/start.mjs ./infra/start.mjs

RUN mkdir -p /app/backend/data && chown node:node /app/backend/data
USER node

EXPOSE 3000 7001
VOLUME ["/app/backend/data"]
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=10 \
  CMD node -e "const port=process.env.FRONTEND_PORT??3000;fetch('http://127.0.0.1:'+port+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "infra/start.mjs"]
