const mongoose = require('mongoose');

const tunnelUri = 'mongodb://dbadmin:NewPassword123!@localhost:27018/employees?retryWrites=false';

console.log('🔗 SSH 터널링을 통한 DocumentDB 연결 (SSL 검증 완전 비활성화)...');

mongoose.connect(tunnelUri, {
  tls: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
  tlsInsecure: true,
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
