import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// DocumentDB SSL 인증서 설정
const getSSLOptions = () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-employees';
  const isDocumentDB = mongoUri.includes('docdb') || mongoUri.includes('documentdb');
  
  if (!isDocumentDB) {
    return {};
  }

  // DocumentDB 글로벌 인증서 경로
  const certPath = path.join(process.cwd(), 'certs', 'global-bundle.pem');
  
  if (fs.existsSync(certPath)) {
    console.log('✅ DocumentDB SSL 인증서 사용:', certPath);
    return {
      tls: true,
      tlsCAFile: certPath,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: true, // DocumentDB는 이것을 true로 설정해야 함
    };
  }

  // 인증서 파일이 없으면 SSL 검증 비활성화 (개발 환경용)
  console.warn('⚠️  DocumentDB SSL 인증서를 찾을 수 없습니다. SSL 검증을 비활성화합니다.');
  return {
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
  };
};

// MongoDB 연결 설정
const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      return;
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-employees';
    const sslOptions = getSSLOptions();
    const isDocumentDB = mongoUri.includes('docdb') || mongoUri.includes('documentdb');
    
    console.log('🔗 MongoDB 연결 시도:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    console.log('🔒 SSL 옵션:', JSON.stringify(sslOptions, null, 2));
    
    // DocumentDB용 기본 연결 옵션
    let connectionOptions = {
      ...sslOptions,
      retryWrites: false, // DocumentDB에서는 retryWrites를 false로 설정
      bufferCommands: false,
      maxPoolSize: 10, // 연결 풀 크기 제한
      serverSelectionTimeoutMS: 15000, // 서버 선택 타임아웃
      socketTimeoutMS: 45000, // 소켓 타임아웃
      connectTimeoutMS: 30000, // 연결 타임아웃
    };

    // DocumentDB 특화 옵션
    if (isDocumentDB) {
      connectionOptions = {
        ...connectionOptions,
        directConnection: false, // DocumentDB 클러스터용
        readPreference: 'primaryPreferred', // DocumentDB 권장 설정
        authMechanism: 'SCRAM-SHA-1', // DocumentDB 호환 인증 메커니즘
        authSource: 'admin', // DocumentDB에서 인증 소스는 admin
      };
    } else {
      // 로컬 MongoDB용 옵션
      connectionOptions = {
        ...connectionOptions,
        directConnection: true,
        readPreference: 'primary',
      };
    }

    console.log('⚙️  연결 옵션:', JSON.stringify(connectionOptions, null, 2));
    
    await mongoose.connect(mongoUri, connectionOptions);
    
    console.log('✅ MongoDB 연결 성공');
    
    // 연결 테스트
    if (isDocumentDB) {
      console.log('🔍 DocumentDB 연결 상태 확인 중...');
      await mongoose.connection.db.admin().ping();
      console.log('✅ DocumentDB ping 성공');
    }
    
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    
    // DocumentDB 특화 오류 메시지
    if (error.message.includes('Unsupported mechanism')) {
      console.error('💡 해결 방법: DocumentDB는 SCRAM-SHA-1 인증만 지원합니다.');
      console.error('💡 mongoose 버전이 7.x인지 확인하세요. (8.x는 DocumentDB와 호환되지 않음)');
    }
    
    process.exit(1);
  }
};

// SignupUser 모델 정의
const signupUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  position: { type: String, required: true, enum: ['employee', 'admin'] },
  status: { type: String, default: 'approved' },
  corp: { type: String, required: true },
  eid: { type: String },
  userType: { type: [String], required: true },
  category: { type: String },
  isFirstLogin: { type: Boolean, default: true },
}, { timestamps: true });

const SignupUser = mongoose.models?.SignupUser || mongoose.model('SignupUser', signupUserSchema);

// Excel 파일의 데이터를 직접 정의
const excelData = [
  ["Name", "userType", "coporation", "position"],
  ["Villicana, Melissa <melissavillicana@csu.fullerton.edu>", "Baker", "SWC", "employee"],
  ["\tTammy Lim <tammytmls@gmail.com>", "Barista", "SWC", "employee"],
  ["Yoona Kang <ynk823@gmail.com>", "Barista", "SWC", "employee"],
  ["Carol An <carolan84@gmail.com>", "Barista", "SWC", "employee"],
  ["Rachel Lee <rachellee0824@gmail.com>", "Barista", "SWC", "employee"],
  ["UMJI MIN <innerpeacemin@gmail.com>", "Barista", "SWC", "employee"],
  ["Julia Li <jjli527@gmail.com>", "Barista", "SWC", "employee"],
  ["Chloe Park <chloepark0925@gmail.com>", "Barista", "SWC", "employee"],
  ["Michelle Le <lemichelle.work@gmail.com>", "Barista", "SWC", "employee"],
  ["Grace Shin <gracee.shinn3@gmail.com>", "Barista", "SWC", "employee"],
  ["Jasper Chung <soridory.07@gmail.com>", "Barista", "SWC", "employee"],
  ["\tJi Ung Tony Baek <b2n3100@gmail.com>", "Barista", "SWC", "employee"],
  ["Landon Mead <landon.mead23@gmail.com>", "Barista", "SWC", "employee"],
  ["Dylan Loh <dloh1201@gmail.com>", "Barista", "SWC", "employee"],
  ["Luke Choe <choelukee@gmail.com>", "Barista", "SWC", "employee"],
  ["Samantha Ro <semu9293@gmail.com>", "Barista", "SWC", "employee"],
  ["Esther Lim <esther001003@gmail.com>", "Barista", "SWC", "employee"],
  ["Buckys Facemask <green.rodriguez2004@gmail.com>", "Baker", "SWC", "employee"],
  ["Sindy Hernández sindyhers68@gmail.com", "Baker", "SWC", "employee"]
];

// 사용자 데이터 추출 및 변환
const extractUsersFromData = () => {
  try {
    console.log('📊 내장된 사용자 데이터 처리 중...');
    
    const users = [];
    
    // 헤더 행을 제외하고 데이터 처리 (첫 번째 행이 헤더)
    for (let i = 1; i < excelData.length; i++) {
      const row = excelData[i];
      
      // 빈 행 건너뛰기
      if (!row || row.length === 0 || !row[0]) {
        continue;
      }
      
      // A열: "이름 <이메일>" 형태에서 이름과 이메일 추출
      let nameEmailString = row[0]?.toString().trim();
      if (!nameEmailString) {
        console.log(`행 ${i + 1}: 이름/이메일 정보가 없습니다.`);
        continue;
      }

      // 탭 문자 제거
      nameEmailString = nameEmailString.replace(/^\t+/, '');
      
      let name, email;
      
      // 정규표현식으로 "이름 <이메일>" 파싱
      const match = nameEmailString.match(/^(.+?)\s*<(.+?)>$/);
      if (match) {
        name = match[1].trim();
        email = match[2].trim();
      } else {
        // "Sindy Hernández sindyhers68@gmail.com" 같은 경우 처리
        const emailMatch = nameEmailString.match(/(.+?)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
        if (emailMatch) {
          name = emailMatch[1].trim();
          email = emailMatch[2].trim();
        } else {
          console.log(`행 ${i + 1}: 이름/이메일 형식을 파싱할 수 없습니다: ${nameEmailString}`);
          continue;
        }
      }
      
      // B열: userType
      const userType = row[1]?.toString().trim() || 'Barista';
      
      // C열: corporation
      const corporation = row[2]?.toString().trim() || 'SWC';
      
      // D열: position
      const position = row[3]?.toString().trim() || 'employee';
      
      // position 값이 admin/employee가 아닌 경우 기본값 설정
      const validPosition = ['admin', 'employee'].includes(position.toLowerCase()) 
        ? position.toLowerCase() 
        : 'employee';
      
      // 임시 비밀번호 생성 (8자리 랜덤)
      const tempPassword = Math.random().toString(36).slice(-8);
      
      const user = {
        name,
        email,
        tempPassword, // 스크립트에서만 사용 (로그용)
        position: validPosition,
        userType: [userType], // 배열로 변환
        corp: corporation,
        eid: `EID${Date.now()}${i}`, // 자동 생성된 직원 ID
        category: 'imported', // 가져온 사용자임을 표시
        isFirstLogin: true, // 첫 로그인 시 비밀번호 재설정하도록
        status: 'approved'
      };
      
      users.push(user);
      console.log(`👤 사용자 ${i}: ${name} (${email}) 파싱 완료`);
    }
    
    return users;
  } catch (error) {
    console.error('❌ 사용자 데이터 처리 실패:', error);
    throw error;
  }
};

// 사용자를 데이터베이스에 생성
const createUsers = async (users) => {
  const results = {
    success: [],
    failed: [],
    skipped: []
  };
  
  for (const userData of users) {
    try {
      // 이미 존재하는 이메일인지 확인
      const existingUser = await SignupUser.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`⚠️  사용자 이미 존재: ${userData.email}`);
        results.skipped.push({ email: userData.email, reason: '이미 존재' });
        continue;
      }
      
      // 비밀번호 암호화
      const hashedPassword = await bcrypt.hash(userData.tempPassword, 10);
      
      // 사용자 데이터 준비 (tempPassword 제외)
      const { tempPassword, ...userDataForDB } = userData;
      userDataForDB.password = hashedPassword;
      
      // 사용자 생성
      const newUser = new SignupUser(userDataForDB);
      await newUser.save();
      
      console.log(`✅ 사용자 생성 성공: ${userData.name} (${userData.email})`);
      console.log(`   임시 비밀번호: ${userData.tempPassword}`);
      
      results.success.push({
        name: userData.name,
        email: userData.email,
        tempPassword: userData.tempPassword,
        position: userData.position,
        userType: userData.userType,
        corp: userData.corp
      });
      
    } catch (error) {
      console.error(`❌ 사용자 생성 실패: ${userData.email}`, error.message);
      results.failed.push({ 
        email: userData.email, 
        error: error.message 
      });
    }
  }
  
  return results;
};

// 메인 실행 함수
const main = async () => {
  try {
    console.log('=== 📋 사용자 생성 스크립트 시작 ===');
    
    // MongoDB 연결
    await connectDB();
    
    // 내장된 데이터에서 사용자 추출
    const users = extractUsersFromData();
    console.log(`\n📊 총 ${users.length}명의 사용자를 찾았습니다.`);
    
    if (users.length === 0) {
      console.log('⚠️  생성할 사용자가 없습니다.');
      return;
    }
    
    // 사용자 생성
    console.log('\n=== 👥 사용자 생성 시작 ===');
    const results = await createUsers(users);
    
    // 결과 출력
    console.log('\n=== 📈 생성 결과 ===');
    console.log(`✅ 성공: ${results.success.length}명`);
    console.log(`❌ 실패: ${results.failed.length}명`);
    console.log(`⚠️  건너뛴: ${results.skipped.length}명`);
    
    if (results.success.length > 0) {
      console.log('\n=== 🔑 생성된 사용자 목록 (임시 비밀번호 포함) ===');
      results.success.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   🔑 임시 비밀번호: ${user.tempPassword}`);
        console.log(`   👔 직급: ${user.position}`);
        console.log(`   🏷️  유형: ${user.userType.join(', ')}`);
        console.log(`   🏢 회사: ${user.corp}`);
        console.log('   ---');
      });
      
      console.log('\n📝 중요: 위의 임시 비밀번호를 안전한 곳에 보관하세요.');
      console.log('🔐 사용자들은 첫 로그인 시 비밀번호 재설정이 필요합니다.');
    }
    
    if (results.failed.length > 0) {
      console.log('\n=== ❌ 실패한 사용자 목록 ===');
      results.failed.forEach((fail, index) => {
        console.log(`${index + 1}. ${fail.email}: ${fail.error}`);
      });
    }
    
    if (results.skipped.length > 0) {
      console.log('\n=== ⚠️  건너뛴 사용자 목록 ===');
      results.skipped.forEach((skip, index) => {
        console.log(`${index + 1}. ${skip.email}: ${skip.reason}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 스크립트 실행 실패:', error);
  } finally {
    // MongoDB 연결 종료
    await mongoose.connection.close();
    console.log('\n=== ✅ 스크립트 완료 ===');
  }
};

// 스크립트 실행
main().catch(console.error); 