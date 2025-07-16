const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
console.log('🔗 연결 시도:', uri.replace(/:[^:@]*@/, ':***@'));

mongoose.connect(uri, {
  tls: true,
  tlsAllowInvalidCertificates: true,
  retryWrites: false,
  bufferCommands: false,
  serverSelectionTimeoutMS: 5000
})
.then(() => {
  console.log('✅ 연결 성공!');
  return mongoose.connection.db.admin().ping();
})
.then(() => {
  console.log('✅ ping 성공!');
  process.exit(0);
})
.catch(err => {
  console.error('❌ 연결 실패:', err.message);
  process.exit(1);
})
.finally(() => {
  mongoose.disconnect();
});
