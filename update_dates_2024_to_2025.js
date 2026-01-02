// mongosh에서 실행할 사용자 생성 스크립트
// 사용법: mongosh "mongodb://username:password@your-docdb-cluster:27017/employees?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false" --tlsCAFile certs/global-bundle.pem < insert-users-mongosh.js

// 데이터베이스 선택
use employees;

// 기존 signupusers 컬렉션이 있는지 확인
print("=== 📋 사용자 생성 스크립트 시작 ===");
print("📊 현재 signupusers 컬렉션 상태 확인...");

const existingCount = db.signupusers.countDocuments();
print(`현재 등록된 사용자 수: ${existingCount}`);

// Excel 데이터에서 추출한 사용자 정보
const usersData = [
  {
    name: "Villicana, Melissa",
    email: "melissavillicana@csu.fullerton.edu",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Tammy Lim",
    email: "tammytmls@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Yoona Kang",
    email: "ynk823@gmail.com", 
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Carol An",
    email: "carolan84@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Rachel Lee",
    email: "rachellee0824@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "UMJI MIN",
    email: "innerpeacemin@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Julia Li",
    email: "jjli527@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Chloe Park",
    email: "chloepark0925@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Michelle Le",
    email: "lemichelle.work@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Grace Shin",
    email: "gracee.shinn3@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Jasper Chung",
    email: "soridory.07@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Ji Ung Tony Baek",
    email: "b2n3100@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Landon Mead",
    email: "landon.mead23@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Dylan Loh",
    email: "dloh1201@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Luke Choe",
    email: "choelukee@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Samantha Ro",
    email: "semu9293@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Esther Lim",
    email: "esther001003@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Buckys Facemask",
    email: "green.rodriguez2004@gmail.com",
    tempPassword: "1q2w3e4r"
  },
  {
    name: "Sindy Hernández",
    email: "sindyhers68@gmail.com",
    tempPassword: "1q2w3e4r"
  }
];

// userType 매핑 (Baker는 3명, 나머지는 Barista)
const userTypeMapping = {
  "melissavillicana@csu.fullerton.edu": "Baker",
  "green.rodriguez2004@gmail.com": "Baker", 
  "sindyhers68@gmail.com": "Baker"
};

// 사용자 문서 생성
const currentTime = new Date();
const usersToInsert = [];
const passwordList = [];

print("\n📊 사용자 데이터 준비 중...");

usersData.forEach((userData, index) => {
  const userType = userTypeMapping[userData.email] || "Barista";
  
  const userDoc = {
    name: userData.name,
    email: userData.email,
    password: userData.tempPassword, // 임시 비밀번호 (평문)
    position: "employee",
    status: "approved",
    corp: "SWC",
    eid: `EID${Date.now()}${index}`,
    userType: [userType],
    category: "imported",
    isFirstLogin: true,
    createdAt: currentTime,
    updatedAt: currentTime
  };
  
  usersToInsert.push(userDoc);
  passwordList.push({
    name: userData.name,
    email: userData.email,
    tempPassword: userData.tempPassword,
    userType: userType
  });
  
  print(`👤 준비완료: ${userData.name} (${userData.email}) - ${userType}`);
});

print(`\n📊 총 ${usersToInsert.length}명의 사용자 준비 완료`);

// 중복 이메일 확인
print("\n🔍 중복 이메일 확인 중...");
const duplicateCheck = [];
const skippedUsers = [];

for (let user of usersToInsert) {
  const existingUser = db.signupusers.findOne({email: user.email});
  if (existingUser) {
    print(`⚠️  이미 존재하는 사용자: ${user.email}`);
    skippedUsers.push(user);
  } else {
    duplicateCheck.push(user);
  }
}

if (skippedUsers.length > 0) {
  print(`⚠️  건너뛸 사용자: ${skippedUsers.length}명`);
}

if (duplicateCheck.length === 0) {
  print("⚠️  삽입할 새 사용자가 없습니다.");
} else {
  print(`\n👥 ${duplicateCheck.length}명의 새 사용자 삽입 시작...`);
  
  try {
    // 사용자 일괄 삽입
    const result = db.signupusers.insertMany(duplicateCheck);
    
    print("✅ 사용자 삽입 성공!");
    print(`📊 삽입된 사용자 수: ${result.insertedIds.length}`);
    
    // 결과 출력
    print("\n=== 🔑 생성된 사용자 목록 (임시 비밀번호 포함) ===");
    passwordList.forEach((user, index) => {
      if (!skippedUsers.find(skipped => skipped.email === user.email)) {
        print(`${index + 1}. ${user.name} (${user.email})`);
        print(`   🔑 임시 비밀번호: ${user.tempPassword}`);
        print(`   👔 직급: employee`);
        print(`   🏷️  유형: ${user.userType}`);
        print(`   🏢 회사: SWC`);
        print("   ---");
      }
    });
    
    print("\n📝 중요 안내:");
    print("🔐 위의 임시 비밀번호를 안전한 곳에 보관하세요.");
    print("🔄 사용자들은 첫 로그인 시 비밀번호 재설정이 필요합니다.");
    print("⚠️  현재 비밀번호는 평문으로 저장되어 있습니다.");
    print("💡 보안을 위해 사용자들이 로그인 후 즉시 비밀번호를 변경하도록 안내하세요.");
    
  } catch (error) {
    print("❌ 사용자 삽입 실패:");
    print(error.toString());
  }
}

// 최종 상태 확인
print("\n=== 📊 최종 상태 확인 ===");
const finalCount = db.signupusers.countDocuments();
print(`총 등록된 사용자 수: ${finalCount}`);

// 삽입된 사용자들 확인
print("\n📋 최근 생성된 사용자 목록:");
db.signupusers.find({category: "imported"}).sort({createdAt: -1}).limit(5).forEach(user => {
  print(`- ${user.name} (${user.email}) - ${user.userType.join(', ')}`);
});

print("\n=== ✅ 스크립트 완료 ===");