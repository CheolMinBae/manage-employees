import mongoose from 'mongoose';
import fetch from 'node-fetch';

// MongoDB 연결 설정
const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      return;
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-employees';
    
    await mongoose.connect(mongoUri, {
      retryWrites: false,
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
    });
    
    console.log('✅ MongoDB 연결 성공');
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
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

// Excel 날짜 시리얼 번호를 날짜로 변환
const excelDateToJSDate = (serial) => {
  // Excel에서 1900년 1월 1일이 1이므로, JavaScript Date로 변환
  const excelEpoch = new Date(1900, 0, 1);
  const jsDate = new Date(excelEpoch.getTime() + (serial - 1) * 24 * 60 * 60 * 1000);
  return jsDate;
};

// 날짜를 YYYY-MM-DD 형식으로 변환
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// 시간 문자열 파싱 (다양한 형식 지원)
const parseTimeString = (timeStr) => {
  if (!timeStr || timeStr === 'off' || timeStr === 'OFF' || timeStr.toLowerCase() === 'off') {
    return null;
  }
  
  // 공백 및 탭 제거
  timeStr = timeStr.toString().trim();
  
  // 다양한 형식의 시간 파싱
  const timePatterns = [
    /^(\d{1,2}):(\d{2})[–\-](\d{1,2}):(\d{2})$/, // 12:00–17:00
    /^(\d{1,2}):(\d{2})\s*[–\-]\s*(\d{1,2}):(\d{2})$/, // 12:00 – 17:00
    /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/, // 12:00-17:00
    /^(\d{1,2}):(\d{2})–(\d{1,2}):(\d{2})$/, // 12:00–17:00
    /^(\d{1,2}):\s*(\d{2})\s*[–\-]\s*(\d{1,2}):(\d{2})$/ // 8: 30-13:30
  ];
  
  for (const pattern of timePatterns) {
    const match = timeStr.match(pattern);
    if (match) {
      const [, startHour, startMin, endHour, endMin] = match;
      const start = `${startHour.padStart(2, '0')}:${startMin}`;
      const end = `${endHour.padStart(2, '0')}:${endMin}`;
      return { start, end };
    }
  }
  
  console.log(`⚠️  시간 형식을 파싱할 수 없습니다: "${timeStr}"`);
  return null;
};

// schedules23.xlsx의 데이터 (실제 파일에서 추출한 데이터)
const scheduleData = [
  ["Name", "Role", 45851, 45852, 45853, 45854, 45855, 45856, 45857, 45858, 45859],
  ["Villicana, Melissa <melissavillicana@csu.fullerton.edu>", "Baker", null, null, null, null, "12:00–17:00", "12:00–17:00", "12:00–17:00", "12:00–17:00"],
  ["\tTammy Lim <tammytmls@gmail.com>", "Barista", null, null, " 16:30–22:30", "08:30–14:30", "14:30–22:30"],
  ["Yoona Kang <ynk823@gmail.com>", "Barista", null, null, "off", "13:30–19:30", "off", "14:30–22:30", "8:30-13:30"],
  ["Carol An <carolan84@gmail.com>", "Barista", "11:30-21:00", "OFF", "17:30-22:30", "OFF", "17:30-22:30", "OFF", "14:00-22:30"],
  ["Rachel Lee <rachellee0824@gmail.com>", "Barista", null, null, null, null, "08:30-22:30 "],
  ["UMJI MIN <innerpeacemin@gmail.com>", "Barista", null, "12:00-17:30", "08:30–14:30", "08:30–13:30", "off", "08:30–14:30", "08:30–16:00"],
  ["Julia Li <jjli527@gmail.com>", "Barista", "8:30-14:30", "8:30-16:30", "8:30-12:30"],
  ["Chloe Park <chloepark0925@gmail.com>", "Barista", null, "10:00–15:00", "11:00–16:00", "11:00–16:00", "11:00–16:00", "17:00–22:30", "14:30–22:30"],
  ["Michelle Le <lemichelle.work@gmail.com>", "Barista", null, null, "17:00-22:30\t"],
  ["Grace Shin <gracee.shinn3@gmail.com>", "Barista", null, null, null, null, "off", "14:30–22:30", "14:30–22:30"],
  ["Jasper Chung <soridory.07@gmail.com>", "Barista", null, null, null, "14:00–22:30", "off", "14:30–22:30", "off"],
  ["\tJi Ung Tony Baek <b2n3100@gmail.com>", "Barista", null, null, null, null, null, "14:30–22:30", "off"],
  ["Landon Mead <landon.mead23@gmail.com>", "Barista", null, null, null, null, "off", "08:30–14:30"],
  ["Dylan Loh <dloh1201@gmail.com>", "Barista", null, null, null, "off", "off", "14:30–22:30", "14:30–22:30"],
  ["Luke Choe <choelukee@gmail.com>", "Barista", null, null, null, "08:30–14:30", "off", "08:30–16:00", "08:30–14:30"],
  ["Samantha Ro <semu9293@gmail.com>", "Barista", null, null, null, null, "off", "14:30–22:30", "off"],
  ["Esther Lim <esther001003@gmail.com>", "Barista", null, null, null, null, "off", "08:30–14:30", "off"],
  ["Buckys Facemask <green.rodriguez2004@gmail.com>", "Baker", null, null, null, null, "off", "12:00–17:00", "12:00–17:00"],
  ["Sindy Hernández sindyhers68@gmail.com", "Baker", null, null, null, null, "off", "12:00–17:00", "12:00–17:00"]
];

// 이름에서 이메일 추출
const extractEmailFromName = (nameStr) => {
  if (!nameStr) return null;
  
  // 탭 문자 제거
  nameStr = nameStr.toString().replace(/^\t+/, '').trim();
  
  // "이름 <이메일>" 형태 파싱
  const match = nameStr.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    const name = match[1].trim();
    const email = match[2].trim();
    return { name, email };
  }
  
  // "이름 이메일" 형태 파싱 (Sindy Hernández 케이스)
  const emailMatch = nameStr.match(/(.+?)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  if (emailMatch) {
    const name = emailMatch[1].trim();
    const email = emailMatch[2].trim();
    return { name, email };
  }
  
  return null;
};

// 사용자 정보 조회
const findUserByEmail = async (email) => {
  try {
    const user = await SignupUser.findOne({ email: email });
    if (user) {
      return {
        userId: user._id.toString(),
        userType: user.userType[0] || 'Barista',
        name: user.name
      };
    }
    return null;
  } catch (error) {
    console.error(`❌ 사용자 조회 실패 (${email}):`, error.message);
    return null;
  }
};

// API를 통해 스케줄 생성
const createScheduleViaAPI = async (scheduleData) => {
  try {
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scheduleData)
    });
    
    if (response.ok) {
      const result = await response.json();
      return { success: true, data: result };
    } else {
      const error = await response.text();
      return { success: false, error: error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 스케줄 데이터 처리
const processScheduleData = async () => {
  console.log('=== 📅 스케줄 데이터 처리 시작 ===');
  
  const results = {
    success: [],
    failed: [],
    skipped: []
  };
  
  // 헤더 행에서 날짜 추출
  const headerRow = scheduleData[0];
  const dates = [];
  
  for (let i = 2; i < headerRow.length; i++) {
    if (typeof headerRow[i] === 'number') {
      const date = excelDateToJSDate(headerRow[i]);
      dates.push(formatDate(date));
    }
  }
  
  console.log(`📊 처리할 날짜 수: ${dates.length}`);
  console.log('📅 날짜 범위:', dates[0], '~', dates[dates.length - 1]);
  
  // 각 사용자별 스케줄 처리
  for (let rowIndex = 1; rowIndex < scheduleData.length; rowIndex++) {
    const row = scheduleData[rowIndex];
    const nameEmailStr = row[0];
    const role = row[1];
    
    if (!nameEmailStr) continue;
    
    // 이메일 추출
    const userInfo = extractEmailFromName(nameEmailStr);
    if (!userInfo) {
      console.log(`⚠️  이름/이메일 파싱 실패: ${nameEmailStr}`);
      results.skipped.push({ nameEmailStr, reason: '이름/이메일 파싱 실패' });
      continue;
    }
    
    console.log(`\n👤 처리 중: ${userInfo.name} (${userInfo.email})`);
    
    // 사용자 정보 조회
    const dbUser = await findUserByEmail(userInfo.email);
    if (!dbUser) {
      console.log(`❌ 사용자를 찾을 수 없습니다: ${userInfo.email}`);
      results.skipped.push({ 
        name: userInfo.name, 
        email: userInfo.email, 
        reason: '사용자를 DB에서 찾을 수 없음' 
      });
      continue;
    }
    
    console.log(`✅ 사용자 찾음: ${dbUser.name} (userType: ${dbUser.userType})`);
    
    // 각 날짜별 스케줄 처리
    for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
      const cellIndex = dateIndex + 2; // Excel에서 C열부터 시작
      const timeStr = row[cellIndex];
      
      if (!timeStr || timeStr === null) continue;
      
      const parsedTime = parseTimeString(timeStr);
      if (!parsedTime) {
        if (timeStr !== 'off' && timeStr !== 'OFF') {
          console.log(`⚠️  시간 파싱 실패: ${timeStr} (${dates[dateIndex]})`);
        }
        continue;
      }
      
      const scheduleEntry = {
        userId: dbUser.userId,
        userType: dbUser.userType,
        date: dates[dateIndex],
        start: parsedTime.start,
        end: parsedTime.end,
        approved: false
      };
      
      console.log(`  📅 ${dates[dateIndex]}: ${parsedTime.start}-${parsedTime.end}`);
      
      // API를 통해 스케줄 생성
      const apiResult = await createScheduleViaAPI(scheduleEntry);
      
      if (apiResult.success) {
        results.success.push({
          name: userInfo.name,
          email: userInfo.email,
          date: dates[dateIndex],
          time: `${parsedTime.start}-${parsedTime.end}`
        });
        console.log(`    ✅ 스케줄 생성 성공`);
      } else {
        results.failed.push({
          name: userInfo.name,
          email: userInfo.email,
          date: dates[dateIndex],
          time: `${parsedTime.start}-${parsedTime.end}`,
          error: apiResult.error
        });
        console.log(`    ❌ 스케줄 생성 실패: ${apiResult.error}`);
      }
      
      // API 요청 간격 조정 (과부하 방지)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
};

// 메인 실행 함수
const main = async () => {
  try {
    console.log('=== 📋 스케줄 가져오기 스크립트 시작 ===');
    
    // MongoDB 연결
    await connectDB();
    
    // 스케줄 데이터 처리
    const results = await processScheduleData();
    
    // 결과 출력
    console.log('\n=== 📊 처리 결과 ===');
    console.log(`✅ 성공: ${results.success.length}개 스케줄`);
    console.log(`❌ 실패: ${results.failed.length}개 스케줄`);
    console.log(`⚠️  건너뛴: ${results.skipped.length}개 항목`);
    
    if (results.success.length > 0) {
      console.log('\n=== ✅ 성공한 스케줄 (처음 10개) ===');
      results.success.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${item.date} ${item.time}`);
      });
      if (results.success.length > 10) {
        console.log(`... 그리고 ${results.success.length - 10}개 더`);
      }
    }
    
    if (results.failed.length > 0) {
      console.log('\n=== ❌ 실패한 스케줄 ===');
      results.failed.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${item.date} ${item.time}`);
        console.log(`   오류: ${item.error}`);
      });
    }
    
    if (results.skipped.length > 0) {
      console.log('\n=== ⚠️  건너뛴 항목 ===');
      results.skipped.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name || item.nameEmailStr} - ${item.reason}`);
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