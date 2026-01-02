// mongosh에서 실행할 스케줄 import 스크립트
// 사용법: mongosh "mongodb://username:password@your-docdb-cluster:27017/employees?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false" --tlsCAFile certs/global-bundle.pem < import-schedules-mongosh.js

// 데이터베이스 선택
use employees;

// 기존 schedules 컬렉션 상태 확인
print("=== 📅 스케줄 import 스크립트 시작 ===");
print("📊 현재 schedules 컬렉션 상태 확인...");

const existingScheduleCount = db.schedules.countDocuments();
print(`현재 등록된 스케줄 수: ${existingScheduleCount}`);

// Excel 날짜 시리얼 번호를 날짜로 변환
const excelDateToJSDate = (serial) => {
  const excelEpoch = new Date(1899, 11, 30); // 1899년 12월 30일
  const jsDate = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
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
    /^(\d{1,2}):(\d{2})[–\-~](\d{1,2}):(\d{2})$/, // 12:00–17:00, 12:00-17:00
    /^(\d{1,2}):(\d{2})\s*[–\-~]\s*(\d{1,2}):(\d{2})$/, // 12:00 – 17:00
    /^(\d{1,2}):(\d{2})–(\d{1,2}):(\d{2})$/, // 12:00–17:00
    /^(\d{1,2}):\s*(\d{2})\s*[–\-~]\s*(\d{1,2}):(\d{2})$/, // 8: 30-13:30
    /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/ // 12:00-17:00
  ];
  
  for (let i = 0; i < timePatterns.length; i++) {
    const pattern = timePatterns[i];
    const match = timeStr.match(pattern);
    if (match) {
      const startHour = match[1].padStart(2, '0');
      const startMin = match[2];
      const endHour = match[3].padStart(2, '0');
      const endMin = match[4];
      const start = startHour + ':' + startMin;
      const end = endHour + ':' + endMin;
      return { start: start, end: end };
    }
  }
  
  print(`⚠️  시간 형식을 파싱할 수 없습니다: "${timeStr}"`);
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
    return { name: name, email: email };
  }
  
  // "이름 이메일" 형태 파싱 (Sindy Hernández 케이스)
  const emailMatch = nameStr.match(/(.+?)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  if (emailMatch) {
    const name = emailMatch[1].trim();
    const email = emailMatch[2].trim();
    return { name: name, email: email };
  }
  
  return null;
};

// 사용자 정보 조회
const findUserByEmail = (email) => {
  try {
    const user = db.signupusers.findOne({ email: email });
    if (user) {
      return {
        userId: user._id.toString(),
        userType: user.userType[0] || 'Barista',
        name: user.name
      };
    }
    return null;
  } catch (error) {
    print(`❌ 사용자 조회 실패 (${email}): ${error.message}`);
    return null;
  }
};

// 셀병합 처리 함수 (null 값을 이전 행의 값으로 채움)
const processMergedCells = (data) => {
  print("📋 셀병합 처리 중...");
  
  const processedData = [];
  
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const currentRow = [...data[rowIndex]]; // 배열 복사
    
    if (rowIndex === 0) {
      // 헤더 행은 그대로 유지
      processedData.push(currentRow);
      continue;
    }
    
    // 이전 행 참조
    const previousRow = processedData[rowIndex - 1];
    
    for (let colIndex = 2; colIndex < currentRow.length; colIndex++) { // 날짜 컬럼만 처리 (인덱스 2부터)
      if (currentRow[colIndex] === null || currentRow[colIndex] === undefined) {
        // null인 경우 이전 행의 같은 컬럼 값으로 채움
        currentRow[colIndex] = previousRow[colIndex];
        
        if (currentRow[colIndex] !== null && currentRow[colIndex] !== undefined) {
          print(`  🔗 셀병합 적용: 행${rowIndex + 1}, 열${colIndex + 1} = "${currentRow[colIndex]}"`);
        }
      }
    }
    
    processedData.push(currentRow);
  }
  
  print(`✅ 셀병합 처리 완료 (${data.length}행 처리)`);
  return processedData;
};

// 스케줄 데이터 처리 및 저장
print("=== 📅 스케줄 데이터 처리 시작 ===");

// 셀병합 처리된 데이터 생성
const processedScheduleData = processMergedCells(scheduleData);

const results = {
  success: [],
  failed: [],
  skipped: [],
  duplicates: []
};

// 헤더 행에서 날짜 추출
const headerRow = processedScheduleData[0];
const dates = [];

for (let i = 2; i < headerRow.length; i++) {
  if (typeof headerRow[i] === 'number') {
    const date = excelDateToJSDate(headerRow[i]);
    dates.push(formatDate(date));
  }
}

print(`📊 처리할 날짜 수: ${dates.length}`);
print(`📅 날짜 범위: ${dates[0]} ~ ${dates[dates.length - 1]}`);

// 각 사용자별 스케줄 처리
for (let rowIndex = 1; rowIndex < processedScheduleData.length; rowIndex++) {
  const row = processedScheduleData[rowIndex];
  const nameEmailStr = row[0];
  const role = row[1];
  
  if (!nameEmailStr) continue;
  
  // 이메일 추출
  const userInfo = extractEmailFromName(nameEmailStr);
  if (!userInfo) {
    print(`⚠️  이름/이메일 파싱 실패: ${nameEmailStr}`);
    results.skipped.push({ nameEmailStr: nameEmailStr, reason: '이름/이메일 파싱 실패' });
    continue;
  }
  
  print(`\n👤 처리 중: ${userInfo.name} (${userInfo.email})`);
  
  // 사용자 정보 조회
  const dbUser = findUserByEmail(userInfo.email);
  if (!dbUser) {
    print(`❌ 사용자를 찾을 수 없습니다: ${userInfo.email}`);
    results.skipped.push({ 
      name: userInfo.name, 
      email: userInfo.email, 
      reason: '사용자를 DB에서 찾을 수 없음' 
    });
    continue;
  }
  
  print(`✅ 사용자 찾음: ${dbUser.name} (userType: ${dbUser.userType})`);
  
  // 각 날짜별 스케줄 처리
  for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
    const cellIndex = dateIndex + 2; // Excel에서 C열부터 시작
    const timeStr = row[cellIndex];
    
    if (!timeStr || timeStr === null) continue;
    
    const parsedTime = parseTimeString(timeStr);
    if (!parsedTime) {
      if (timeStr !== 'off' && timeStr !== 'OFF') {
        print(`⚠️  시간 파싱 실패: ${timeStr} (${dates[dateIndex]})`);
      }
      continue;
    }
    
    const scheduleEntry = {
      userId: dbUser.userId,
      userType: dbUser.userType,
      date: dates[dateIndex],
      start: parsedTime.start,
      end: parsedTime.end,
      approved: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    print(`  📅 ${dates[dateIndex]}: ${parsedTime.start}-${parsedTime.end}`);
    
    try {
      // 중복 확인
      const existingSchedule = db.schedules.findOne({
        userId: dbUser.userId,
        date: dates[dateIndex],
        start: parsedTime.start,
        end: parsedTime.end
      });
      
      if (existingSchedule) {
        print(`    ⚠️  중복 스케줄 건너뛰기`);
        results.duplicates.push({
          name: userInfo.name,
          email: userInfo.email,
          date: dates[dateIndex],
          time: `${parsedTime.start}-${parsedTime.end}`
        });
        continue;
      }
      
      // 스케줄 저장
      const insertResult = db.schedules.insertOne(scheduleEntry);
      
      if (insertResult.acknowledged) {
        print(`    ✅ 스케줄 저장 성공`);
        results.success.push({
          name: userInfo.name,
          email: userInfo.email,
          date: dates[dateIndex],
          time: `${parsedTime.start}-${parsedTime.end}`
        });
      } else {
        print(`    ❌ 스케줄 저장 실패: insertOne 실패`);
        results.failed.push({
          name: userInfo.name,
          email: userInfo.email,
          date: dates[dateIndex],
          time: `${parsedTime.start}-${parsedTime.end}`,
          error: 'insertOne 실패'
        });
      }
      
    } catch (error) {
      print(`    ❌ 스케줄 저장 실패: ${error.message}`);
      results.failed.push({
        name: userInfo.name,
        email: userInfo.email,
        date: dates[dateIndex],
        time: `${parsedTime.start}-${parsedTime.end}`,
        error: error.message
      });
    }
  }
}

// 결과 출력
print("\n=== 📊 처리 결과 ===");
print(`✅ 성공: ${results.success.length}개 스케줄`);
print(`❌ 실패: ${results.failed.length}개 스케줄`);
print(`⚠️  중복: ${results.duplicates.length}개 스케줄`);
print(`⚠️  건너뛴: ${results.skipped.length}개 항목`);

if (results.success.length > 0) {
  print("\n=== ✅ 성공한 스케줄 (처음 10개) ===");
  for (let i = 0; i < Math.min(10, results.success.length); i++) {
    const item = results.success[i];
    print(`${i + 1}. ${item.name} - ${item.date} ${item.time}`);
  }
  if (results.success.length > 10) {
    print(`... 그리고 ${results.success.length - 10}개 더`);
  }
}

if (results.duplicates.length > 0) {
  print("\n=== ⚠️  중복으로 건너뛴 스케줄 (처음 5개) ===");
  for (let i = 0; i < Math.min(5, results.duplicates.length); i++) {
    const item = results.duplicates[i];
    print(`${i + 1}. ${item.name} - ${item.date} ${item.time}`);
  }
  if (results.duplicates.length > 5) {
    print(`... 그리고 ${results.duplicates.length - 5}개 더`);
  }
}

if (results.failed.length > 0) {
  print("\n=== ❌ 실패한 스케줄 ===");
  results.failed.forEach((item, index) => {
    print(`${index + 1}. ${item.name} - ${item.date} ${item.time}`);
    print(`   오류: ${item.error}`);
  });
}

if (results.skipped.length > 0) {
  print("\n=== ⚠️  건너뛴 항목 ===");
  results.skipped.forEach((item, index) => {
    print(`${index + 1}. ${item.name || item.nameEmailStr} - ${item.reason}`);
  });
}

// 최종 통계
print("\n=== 📈 최종 통계 ===");
const finalScheduleCount = db.schedules.countDocuments();
print(`총 저장된 스케줄 수: ${finalScheduleCount}`);

// 삽입된 스케줄들 확인
print("\n📋 최근 생성된 스케줄 목록 (최대 5개):");
db.schedules.find().sort({createdAt: -1}).limit(5).forEach(schedule => {
  print(`- ${schedule.date} ${schedule.start}-${schedule.end} (${schedule.userType}) - userId: ${schedule.userId}`);
});

print("\n=== ✅ 스크립트 완료 ==="); 