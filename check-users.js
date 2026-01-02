const mongoose = require('mongoose');

const uri = 'mongodb://dbadmin:NewPassword123!@manage-employees-docdb-instance-1.cyziqcc2uryk.us-east-1.docdb.amazonaws.com:27017/?tls=true&tlsCAFile=global-bundle.pem&retryWrites=false';

console.log('🔗 DocumentDB 연결 시도...');

mongoose.connect(uri, {
  bufferCommands: false,
  serverSelectionTimeoutMS: 10000
})
.then(async () => {
  console.log('✅ DocumentDB 연결 성공!');
  
  const db = mongoose.connection.db;
  
  // 컬렉션 목록 확인
  const collections = await db.listCollections().toArray();
  console.log('\n📋 컬렉션 목록:', collections.map(c => c.name));
  
  // signupusers 컬렉션에서 유저 조회
  const usersCollection = db.collection('signupusers');
  const users = await usersCollection.find({}).toArray();
  
  console.log(`\n👥 총 유저 수: ${users.length}명\n`);
  console.log('='.repeat(100));
  console.log('No. | Name                 | UserType              | Position    | Corp         | EID      | Status');
  console.log('='.repeat(100));
  
  users.forEach((user, index) => {
    const name = (user.name || 'N/A').padEnd(20);
    const userType = (Array.isArray(user.userType) ? user.userType.join(', ') : (user.userType || 'N/A')).padEnd(21);
    const position = (user.position || 'N/A').padEnd(11);
    const corp = (user.corp || 'N/A').padEnd(12);
    const eid = String(user.eid || 'N/A').padEnd(8);
    const status = user.status || 'active';
    
    console.log(`${String(index + 1).padStart(3)} | ${name} | ${userType} | ${position} | ${corp} | ${eid} | ${status}`);
  });
  
  console.log('='.repeat(100));
  
  process.exit(0);
})
.catch(err => {
  console.error('❌ 연결 실패:', err.message);
  process.exit(1);
})
.finally(() => {
  mongoose.disconnect();
});
