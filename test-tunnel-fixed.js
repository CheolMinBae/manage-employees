const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// SSL 인증서 경로
const certPath = path.join(process.cwd(), 'certs', 'global-bundle.pem');

let sslOptions = {};
if (fs.existsSync(certPath)) {
  console.log('✅ SSL 인증서 파일 사용:', certPath);
  sslOptions = {
    tls: true,
    tlsCAFile: certPath,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
  };
} else {
  console.log('⚠️  SSL 인증서 없음 - 검증 비활성화');
  sslOptions = {
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
  };
}

const tunnelUri = 'mongodb://dbadmin:NewPassword123!@localhost:27018/employees?retryWrites=false';

console.log('🔗 SSH 터널링을 통한 DocumentDB 연결 시도...');
console.log('📍 URI:', tunnelUri);
console.log('🔒 SSL 옵션:', sslOptions);

mongoose.connect(tunnelUri, {
  ...sslOptions,
  retryWrites: false,
  bufferCommands: false,
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
  socketTimeoutMS: 15000,
})
.then(() => {
  console.log('✅ DocumentDB 연결 성공!');
  return mongoose.connection.db.admin().ping();
})
.then(() => {
  console.log('✅ ping 성공!');
  return mongoose.connection.db.listCollections().toArray();
})
.then(collections => {
  console.log('📋 컬렉션 목록:', collections.map(c => c.name));
  process.exit(0);
})
.catch(err => {
  console.error('❌ 연결 실패:', err.message);
  console.error('상세 에러:', err);
  process.exit(1);
})
.finally(() => {
  mongoose.disconnect();
});
