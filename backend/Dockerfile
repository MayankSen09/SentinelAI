FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Prune dev dependencies in production image
RUN npm prune --omit=dev 2>/dev/null || true

ENV NODE_ENV=production
ENV PORT=3001
ENV DEMO_MODE=true

EXPOSE 3001

CMD ["node", "dist/index.js"]
