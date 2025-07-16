const mongoose = require('mongoose');

// 로컬 MongoDB로 테스트
const localUri = 'mongodb://localhost:27017/employee-management';
console.log('🔗 로컬 MongoDB 연결 시도...');

mongoose.connect(localUri, {
  bufferCommands: false,
  serverSelectionTimeoutMS: 3000
})
.then(() => {
  console.log('✅ 로컬 MongoDB 연결 성공!');
  return mongoose.connection.db.listCollections().toArray();
})
.then(collections => {
  console.log('📋 컬렉션 목록:', collections.map(c => c.name));
  process.exit(0);
})
.catch(err => {
  console.error('❌ 연결 실패:', err.message);
  if (err.message.includes('ECONNREFUSED')) {
    console.log('💡 MongoDB가 실행되지 않았습니다. 실행 명령:');
    console.log('   - Homebrew: brew services start mongodb/brew/mongodb-community');
    console.log('   - Docker: docker run -d -p 27017:27017 --name local-mongo mongo:latest');
  }
  process.exit(1);
})
.finally(() => {
  mongoose.disconnect();
});
