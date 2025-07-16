const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const certPath = path.join(process.cwd(), 'certs', 'global-bundle.pem');

const sslOptions = {
  tls: true,
  tlsCAFile: certPath,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: true,  // 이 옵션이 핵심!
};

const tunnelUri = 'mongodb://dbadmin:NewPassword123!@localhost:27018/employees?retryWrites=false';

console.log('🔗 SSH 터널링을 통한 DocumentDB 연결 시도 (hostname 검증 비활성화)...');

mongoose.connect(tunnelUri, {
  ...sslOptions,
  retryWrites: false,
  bufferCommands: false,
  serverSelectionTimeoutMS: 15000,
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
  process.exit(1);
})
.finally(() => {
  mongoose.disconnect();
});
