FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --workspace apps/api --include-workspace-root

COPY tsconfig.base.json ./
COPY prisma ./prisma
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

RUN npx prisma generate
RUN npm run build --workspace apps/api

CMD ["node", "apps/api/dist/server.js"]
