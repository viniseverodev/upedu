FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# ---

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev
RUN npx prisma generate

COPY --from=builder /app/dist ./dist/

# SEC-002: rodar como non-root (espelha frontend/Dockerfile)
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nodeapp
USER nodeapp

EXPOSE 3001
CMD ["node", "dist/server.js"]
