// 테스트용 스케줄 데이터 생성 쿼리

// 1. 먼저 기존 데이터 확인
db.schedules.find({}).limit(5)

// 2. 사용자 ID 확인 (실제 사용자 ID를 얻기 위해)
db.signupusers.find({}, {_id: 1, name: 1}).limit(5)

// 3. 오늘 날짜 확인
new Date().toISOString().split('T')[0]

// 4. 예시 스케줄 데이터 생성 (실제 사용자 ID로 변경해서 사용)
// 아래 ObjectId들을 실제 사용자 ID로 변경하세요
db.schedules.insertMany([
  {
    userId: "실제사용자ObjectId1",
    date: "2024-12-19", // 오늘 날짜로 변경
    start: "09:00",
    end: "17:00",
    approved: true
  },
  {
    userId: "실제사용자ObjectId2", 
    date: "2024-12-19", // 오늘 날짜로 변경
    start: "10:00",
    end: "18:00",
    approved: true
  },
  {
    userId: "실제사용자ObjectId3",
    date: "2024-12-19", // 오늘 날짜로 변경
    start: "14:00",
    end: "22:00",
    approved: true
  },
  {
    userId: "실제사용자ObjectId4",
    date: "2024-12-19", // 오늘 날짜로 변경
    start: "06:00",
    end: "14:00",
    approved: true
  }
])

// 5. 생성된 데이터 확인
db.schedules.find({date: "2024-12-19"}) // 오늘 날짜로 변경 