// 데이터베이스 선택
use('test');

// 2024년 날짜를 2025년으로 변경하는 스크립트
print("=== 2024년 날짜를 2025년으로 변경 시작 ===");

// 먼저 2024년으로 시작하는 스케줄 개수 확인
const count2024 = db.schedules.countDocuments({
  date: { $regex: /^2024-/ }
});
print(`2024년 스케줄 개수: ${count2024}`);

if (count2024 > 0) {
  // 2024년 날짜를 2025년으로 변경
  const result = db.schedules.updateMany(
    { date: { $regex: /^2024-/ } },
    [
      {
        $set: {
          date: {
            $replaceOne: {
              input: "$date",
              find: "2024",
              replacement: "2025"
            }
          }
        }
      }
    ]
  );
  
  print(`업데이트된 문서 수: ${result.modifiedCount}`);
  print(`매칭된 문서 수: ${result.matchedCount}`);
  
  // 변경 후 확인
  const count2025 = db.schedules.countDocuments({
    date: { $regex: /^2025-/ }
  });
  print(`변경 후 2025년 스케줄 개수: ${count2025}`);
  
  // 샘플 데이터 확인 (처음 5개)
  print("\n=== 변경된 스케줄 샘플 ===");
  db.schedules.find({
    date: { $regex: /^2025-/ }
  }).limit(5).forEach(doc => {
    print(`ID: ${doc._id}, Date: ${doc.date}, User: ${doc.userId}`);
  });
  
} else {
  print("2024년 날짜를 가진 스케줄이 없습니다.");
}

print("=== 날짜 변경 완료 ==="); 