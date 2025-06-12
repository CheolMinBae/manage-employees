// 데이터베이스 선택
use('test');

// 나머지 직원들의 스케줄 데이터 삽입

// matthew 스케줄
db.schedules.insertMany([
  {
    "userId": '683d0398078ffd05efb92d79',
    "date": "2024-06-08",
    "start": "15:00",
    "end": "21:00",
    "approved": false
  },
  {
    "userId": '683d0398078ffd05efb92d79',
    "date": "2024-06-14",
    "start": "10:00",
    "end": "16:00",
    "approved": false
  }
]);
print("matthew 스케줄 삽입 완료");

// Luke 스케줄
db.schedules.insertMany([
  {
    "userId": "683d0399078ffd05efb92d7f",
    "date": "2024-06-09",
    "start": "14:00",
    "end": "19:00",
    "approved": false
  },
  {
    "userId": "683d0399078ffd05efb92d7f",
    "date": "2024-06-09",
    "start": "19:30",
    "end": "22:30",
    "approved": false
  },
  {
    "userId": "683d0399078ffd05efb92d7f",
    "date": "2024-06-11",
    "start": "15:00",
    "end": "22:30",
    "approved": false
  },
  {
    "userId": "683d0399078ffd05efb92d7f",
    "date": "2024-06-12",
    "start": "15:00",
    "end": "22:30",
    "approved": false
  },
  {
    "userId": "683d0399078ffd05efb92d7f",
    "date": "2024-06-13",
    "start": "16:00",
    "end": "21:00",
    "approved": false
  },
  {
    "userId": "683d0399078ffd05efb92d7f",
    "date": "2024-06-14",
    "start": "13:00",
    "end": "21:00",
    "approved": false
  }
]);
print("Luke 스케줄 삽입 완료");

// Esther Lim 스케줄
db.schedules.insertMany([
  {
    "userId": '683d039a078ffd05efb92d8b',
    "date": "2024-06-10",
    "start": "08:30",
    "end": "15:00",
    "approved": false
  },
  {
    "userId": '683d039a078ffd05efb92d8b',
    "date": "2024-06-11",
    "start": "08:30",
    "end": "15:00",
    "approved": false
  },
  {
    "userId": '683d039a078ffd05efb92d8b',
    "date": "2024-06-12",
    "start": "08:30",
    "end": "15:00",
    "approved": false
  }
]);
print("Esther Lim 스케줄 삽입 완료");

// Tony 스케줄
db.schedules.insertMany([
  {
    "userId": "683d039c078ffd05efb92d97",
    "date": "2024-06-09",
    "start": "13:00",
    "end": "21:00",
    "approved": false
  },
  {
    "userId": "683d039c078ffd05efb92d97",
    "date": "2024-06-10",
    "start": "13:00",
    "end": "21:00",
    "approved": false
  },
  {
    "userId": "683d039c078ffd05efb92d97",
    "date": "2024-06-11",
    "start": "13:00",
    "end": "21:00",
    "approved": false
  },
  {
    "userId": "683d039c078ffd05efb92d97",
    "date": "2024-06-12",
    "start": "13:00",
    "end": "21:00",
    "approved": false
  },
  {
    "userId": "683d039c078ffd05efb92d97",
    "date": "2024-06-13",
    "start": "08:30",
    "end": "12:00",
    "approved": false
  }
]);
print("Tony 스케줄 삽입 완료");

// Cody Redmond 스케줄
db.schedules.insertMany([
  {
    "userId": "683d039d078ffd05efb92d9d",
    "date": "2024-06-08",
    "start": "08:30",
    "end": "14:00",
    "approved": false
  },
  {
    "userId": "683d039d078ffd05efb92d9d",
    "date": "2024-06-09",
    "start": "08:30",
    "end": "14:00",
    "approved": false
  },
  {
    "userId": "683d039d078ffd05efb92d9d",
    "date": "2024-06-11",
    "start": "09:00",
    "end": "16:30",
    "approved": false
  },
  {
    "userId": "683d039d078ffd05efb92d9d",
    "date": "2024-06-13",
    "start": "09:00",
    "end": "16:30",
    "approved": false
  },
  {
    "userId": "683d039d078ffd05efb92d9d",
    "date": "2024-06-14",
    "start": "08:30",
    "end": "14:00",
    "approved": false
  }
]);
print("Cody Redmond 스케줄 삽입 완료");

// Karen Aguilar 스케줄
db.schedules.insertMany([
  {
    "userId": "683d039d078ffd05efb92da0",
    "date": "2024-06-08",
    "start": "16:30",
    "end": "22:30",
    "approved": false
  },
  {
    "userId": "683d039d078ffd05efb92da0",
    "date": "2024-06-12",
    "start": "16:30",
    "end": "22:30",
    "approved": false
  },
  {
    "userId": "683d039d078ffd05efb92da0",
    "date": "2024-06-13",
    "start": "16:30",
    "end": "22:30",
    "approved": false
  },
  {
    "userId": "683d039d078ffd05efb92da0",
    "date": "2024-06-14",
    "start": "16:30",
    "end": "22:30",
    "approved": false
  }
]);
print("Karen Aguilar 스케줄 삽입 완료");

// Irene 스케줄
db.schedules.insertMany([
  {
    "userId": "68495e9cc850a194963f7078",
    "date": "2024-06-09",
    "start": "08:30",
    "end": "14:00",
    "approved": false
  },
  {
    "userId": "68495e9cc850a194963f7078",
    "date": "2024-06-10",
    "start": "08:30",
    "end": "14:00",
    "approved": false
  },
  {
    "userId": "68495e9cc850a194963f7078",
    "date": "2024-06-11",
    "start": "15:00",
    "end": "22:30",
    "approved": false
  },
  {
    "userId": "68495e9cc850a194963f7078",
    "date": "2024-06-13",
    "start": "12:00",
    "end": "18:00",
    "approved": false
  },
  {
    "userId": "68495e9cc850a194963f7078",
    "date": "2024-06-14",
    "start": "08:30",
    "end": "12:00",
    "approved": false
  }
]);
print("Irene 스케줄 삽입 완료");

// Rachel Lee 스케줄
db.schedules.insertMany([
  {
    "userId": "68495ebfc850a194963f7082",
    "date": "2024-06-09",
    "start": "15:00",
    "end": "22:30",
    "approved": false
  },
  {
    "userId": "68495ebfc850a194963f7082",
    "date": "2024-06-10",
    "start": "15:00",
    "end": "22:30",
    "approved": false
  },
  {
    "userId": "68495ebfc850a194963f7082",
    "date": "2024-06-12",
    "start": "15:00",
    "end": "22:30",
    "approved": false
  },
  {
    "userId": "68495ebfc850a194963f7082",
    "date": "2024-06-14",
    "start": "15:00",
    "end": "22:30",
    "approved": false
  }
]);
print("Rachel Lee 스케줄 삽입 완료");

// 전체 사용자 목록 확인 (디버깅용)
print("=== 전체 사용자 목록 ===");
db.signupusers.find({}, {name: 1, _id: 1}).forEach(function(user) {
  print("이름: " + user.name + ", ID: " + user._id);
});

// 삽입 완료 확인
print("=== 나머지 스케줄 데이터 삽입 완료! ===");
print("총 스케줄 개수: " + db.schedules.countDocuments()); 