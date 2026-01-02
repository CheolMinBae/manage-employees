const mongoose = require('mongoose');

const PROD_API = 'http://3.81.172.239:3000';
const LOCAL_MONGODB = 'mongodb://localhost:27017/employee-management';

async function syncFromProd() {
  console.log('🔗 로컬 MongoDB 연결 중...');
  await mongoose.connect(LOCAL_MONGODB);
  console.log('✅ 연결 성공!\n');

  const db = mongoose.connection.db;

  // 1. 유저 데이터 가져오기
  console.log('📥 운영 서버에서 유저 데이터 가져오는 중...');
  const usersRes = await fetch(`${PROD_API}/api/users`);
  const users = await usersRes.json();
  console.log(`   → ${users.length}명의 유저 발견`);

  // 2. 스케줄 데이터 가져오기
  console.log('📥 운영 서버에서 스케줄 데이터 가져오는 중...');
  const schedulesRes = await fetch(`${PROD_API}/api/schedules`);
  const schedules = await schedulesRes.json();
  console.log(`   → ${schedules.length}개의 스케줄 발견`);

  // 3. 스케줄 템플릿 가져오기
  console.log('📥 운영 서버에서 스케줄 템플릿 가져오는 중...');
  const templatesRes = await fetch(`${PROD_API}/api/schedule-templates`);
  const templates = await templatesRes.json();
  console.log(`   → ${templates.length}개의 템플릿 발견`);

  // 4. 유저 역할(UserRole) 가져오기
  console.log('📥 운영 서버에서 유저 역할 가져오는 중...');
  const rolesRes = await fetch(`${PROD_API}/api/userrole`);
  const roles = await rolesRes.json();
  console.log(`   → ${roles.length}개의 역할 발견\n`);

  // 5. 로컬 컬렉션 초기화 (기존 데이터 삭제)
  console.log('🗑️  로컬 컬렉션 초기화 중...');
  await db.collection('signupusers').deleteMany({});
  await db.collection('schedules').deleteMany({});
  await db.collection('scheduletemplates').deleteMany({});
  await db.collection('userroles').deleteMany({});
  console.log('   → 기존 데이터 삭제 완료\n');

  // 6. 유저 데이터 삽입
  if (users.length > 0) {
    console.log('📤 유저 데이터 삽입 중...');
    const usersToInsert = users.map(u => ({
      ...u,
      _id: new mongoose.Types.ObjectId(u._id),
      createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
      updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
    }));
    await db.collection('signupusers').insertMany(usersToInsert);
    console.log(`   → ${users.length}명의 유저 삽입 완료`);
  }

  // 7. 스케줄 데이터 삽입
  if (schedules.length > 0) {
    console.log('📤 스케줄 데이터 삽입 중...');
    const schedulesToInsert = schedules.map(s => ({
      ...s,
      _id: new mongoose.Types.ObjectId(s._id),
      userId: new mongoose.Types.ObjectId(s.userId),
      createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
      updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
    }));
    await db.collection('schedules').insertMany(schedulesToInsert);
    console.log(`   → ${schedules.length}개의 스케줄 삽입 완료`);
  }

  // 8. 스케줄 템플릿 삽입
  if (templates.length > 0) {
    console.log('📤 스케줄 템플릿 삽입 중...');
    const templatesToInsert = templates.map(t => ({
      ...t,
      _id: new mongoose.Types.ObjectId(t._id),
      createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
      updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
    }));
    await db.collection('scheduletemplates').insertMany(templatesToInsert);
    console.log(`   → ${templates.length}개의 템플릿 삽입 완료`);
  }

  // 9. 유저 역할 삽입
  if (roles.length > 0) {
    console.log('📤 유저 역할 삽입 중...');
    const rolesToInsert = roles.map(r => ({
      ...r,
      _id: new mongoose.Types.ObjectId(r._id),
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
    }));
    await db.collection('userroles').insertMany(rolesToInsert);
    console.log(`   → ${roles.length}개의 역할 삽입 완료`);
  }

  // 10. 결과 확인
  console.log('\n' + '='.repeat(50));
  console.log('✅ 동기화 완료!');
  console.log('='.repeat(50));
  
  const userCount = await db.collection('signupusers').countDocuments();
  const scheduleCount = await db.collection('schedules').countDocuments();
  const templateCount = await db.collection('scheduletemplates').countDocuments();
  const roleCount = await db.collection('userroles').countDocuments();
  
  console.log(`📊 로컬 DB 현황:`);
  console.log(`   - 유저: ${userCount}명`);
  console.log(`   - 스케줄: ${scheduleCount}개`);
  console.log(`   - 템플릿: ${templateCount}개`);
  console.log(`   - 역할: ${roleCount}개`);

  await mongoose.disconnect();
  console.log('\n🔌 연결 종료');
}

syncFromProd().catch(err => {
  console.error('❌ 에러:', err.message);
  process.exit(1);
});
