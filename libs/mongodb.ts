// libs/mongodb.ts
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env.MONGODB_URI!;

// DocumentDB SSL 인증서 설정
const getSSLOptions = () => {
  const isDocumentDB = MONGODB_URI.includes('docdb') || MONGODB_URI.includes('documentdb');
  
  if (!isDocumentDB) {
    return {};
  }

  // DocumentDB 글로벌 인증서 경로
  const certPath = path.join(process.cwd(), 'certs', 'global-bundle.pem');
  
  if (fs.existsSync(certPath)) {
    return {
      tls: true,
      tlsCAFile: certPath,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: true, // DocumentDB는 이것을 true로 설정해야 함
    };
  }

  // 인증서 파일이 없으면 SSL 검증 비활성화 (개발 환경용)
  console.warn('Warning: DocumentDB SSL certificate not found. SSL validation disabled.');
  return {
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
  };
};

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  
  const sslOptions = getSSLOptions();
  
  return mongoose.connect(MONGODB_URI, {
    ...sslOptions,
    retryWrites: false, // DocumentDB에서는 retryWrites를 false로 설정
    bufferCommands: false,
    directConnection: false, // DocumentDB 클러스터용
    readPreference: 'primaryPreferred', // DocumentDB 권장 설정
    maxPoolSize: 10, // 연결 풀 크기 제한
    serverSelectionTimeoutMS: 5000, // 서버 선택 타임아웃
    socketTimeoutMS: 45000, // 소켓 타임아웃
  });
};
