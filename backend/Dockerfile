# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# [✅ 추가 1] 빌드 단계에서 openssl 설치 (Prisma가 버전 감지하도록)
RUN apk add --no-cache openssl

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

COPY src ./src
COPY prisma ./prisma

# 이제 OpenSSL 3.x를 감지하고 알맞은 엔진을 생성함
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# [✅ 추가 2] 실행 단계에서도 기본 openssl 설치 (복잡한 compat 패키지 불필요)
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# 빌드된 파일 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# 포트 통일 (3000)
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 시작 명령어
CMD ["node", "dist/index.js"]
