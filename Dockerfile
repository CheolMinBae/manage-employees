FROM node:18-alpine

WORKDIR /app

# 빌드 인자 받기
ARG MONGODB_URI

# pnpm 설치
RUN npm install -g pnpm

# 패키지 파일 복사
COPY package.json ./
COPY pnpm-lock.yaml ./

# 의존성 설치
RUN pnpm install

# 소스 복사
COPY . .

# 환경변수 설정
ENV MONGODB_URI=${MONGODB_URI}
ENV NODE_ENV=production

# 빌드
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"] 