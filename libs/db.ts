// src/libs/db.ts
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('❌ Please define the MONGODB_URI environment variable inside .env.local');
}

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
      tlsAllowInvalidHostnames: false,
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

let cached = (global as any).mongoose || { conn: null, promise: null };

export default async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const sslOptions = getSSLOptions();
    
    cached.promise = mongoose.connect(MONGODB_URI, {
      ...sslOptions,
      retryWrites: false, // DocumentDB에서는 retryWrites를 false로 설정
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
