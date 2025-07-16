FROM node:18-alpine

WORKDIR /app

# DocumentDB SSL 인증서 다운로드
RUN apk add --no-cache wget && \
    mkdir -p certs && \
    wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -O certs/global-bundle.pem

# pnpm 설치
RUN npm install -g pnpm

# 패키지 파일 복사
COPY package.json ./
COPY pnpm-lock.yaml ./

# 의존성 설치
RUN pnpm install

# 소스 복사
COPY . .

# 빌드 인자 받기
ARG MONGODB_URI
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL
ARG EMAIL_USER
ARG EMAIL_PASS

# 환경변수 설정
ENV MONGODB_URI=${MONGODB_URI}
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV EMAIL_USER=${EMAIL_USER}
ENV EMAIL_PASS=${EMAIL_PASS}
ENV NODE_ENV=production

# 빌드
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"] 