// 1. 데이터베이스 선택
use('manage-employees-db');

// 2. 먼저 사용자 목록 확인
db.signupusers.find({}, {name: 1, _id: 1});

// 3. 스케줄 데이터 삽입 (유저 이름으로 userId 찾아서 삽입)
// matthew 스케줄
var matthewUser = db.signupusers.findOne({name: "matthew"});
if (matthewUser) {
  db.schedules.insertMany([
    {
      userId: matthewUser._id.toString(),
      date: "2024-06-08",
      start: "15:00",
      end: "21:00",
      approved: false
    },
    {
      userId: matthewUser._id.toString(),
      date: "2024-06-14",
      start: "10:00",
      end: "16:00",
      approved: false
    }
  ]);
}

// Julia Li 스케줄
var juliaUser = db.signupusers.findOne({name: "Julia Li"});
if (juliaUser) {
  db.schedules.insertMany([
    {
      userId: juliaUser._id.toString(),
      date: "2024-06-08",
      start: "12:00",
      end: "18:00",
      approved: false
    },
    {
      userId: juliaUser._id.toString(),
      date: "2024-06-09",
      start: "08:30",
      end: "12:00",
      approved: false
    },
    {
      userId: juliaUser._id.toString(),
      date: "2024-06-11",
      start: "08:30",
      end: "12:00",
      approved: false
    },
    {
      userId: juliaUser._id.toString(),
      date: "2024-06-12",
      start: "08:30",
      end: "17:00",
      approved: false
    },
    {
      userId: juliaUser._id.toString(),
      date: "2024-06-13",
      start: "08:30",
      end: "17:00",
      approved: false
    }
  ]);
}

// Luke 스케줄
var lukeUser = db.signupusers.findOne({name: "Luke"});
if (lukeUser) {
  db.schedules.insertMany([
    {
      userId: lukeUser._id.toString(),
      date: "2024-06-09",
      start: "14:00",
      end: "19:00",
      approved: false
    },
    {
      userId: lukeUser._id.toString(),
      date: "2024-06-09",
      start: "19:30",
      end: "22:30",
      approved: false
    },
    {
      userId: lukeUser._id.toString(),
      date: "2024-06-11",
      start: "15:00",
      end: "22:30",
      approved: false
    },
    {
      userId: lukeUser._id.toString(),
      date: "2024-06-12",
      start: "15:00",
      end: "22:30",
      approved: false
    },
    {
      userId: lukeUser._id.toString(),
      date: "2024-06-13",
      start: "16:00",
      end: "21:00",
      approved: false
    },
    {
      userId: lukeUser._id.toString(),
      date: "2024-06-14",
      start: "13:00",
      end: "21:00",
      approved: false
    }
  ]);
}

// Michelle Le 스케줄
var michelleUser = db.signupusers.findOne({name: "Michelle Le"});
if (michelleUser) {
  db.schedules.insertMany([
    {
      userId: michelleUser._id.toString(),
      date: "2024-06-09",
      start: "15:30",
      end: "22:30",
      approved: false
    },
    {
      userId: michelleUser._id.toString(),
      date: "2024-06-13",
      start: "15:30",
      end: "22:30",
      approved: false
    }
  ]);
}

// Grace Shin 스케줄
var graceUser = db.signupusers.findOne({name: "Grace Shin"});
if (graceUser) {
  db.schedules.insertMany([
    {
      userId: graceUser._id.toString(),
      date: "2024-06-08",
      start: "15:30",
      end: "23:00",
      approved: false
    },
    {
      userId: graceUser._id.toString(),
      date: "2024-06-10",
      start: "10:00",
      end: "15:30",
      approved: false
    },
    {
      userId: graceUser._id.toString(),
      date: "2024-06-12",
      start: "10:00",
      end: "15:30",
      approved: false
    },
    {
      userId: graceUser._id.toString(),
      date: "2024-06-13",
      start: "15:30",
      end: "23:00",
      approved: false
    },
    {
      userId: graceUser._id.toString(),
      date: "2024-06-14",
      start: "15:30",
      end: "23:00",
      approved: false
    }
  ]);
}

// Esther Lim 스케줄
var estherUser = db.signupusers.findOne({name: "Esther Lim"});
if (estherUser) {
  db.schedules.insertMany([
    {
      userId: estherUser._id.toString(),
      date: "2024-06-10",
      start: "08:30",
      end: "15:00",
      approved: false
    },
    {
      userId: estherUser._id.toString(),
      date: "2024-06-11",
      start: "08:30",
      end: "15:00",
      approved: false
    },
    {
      userId: estherUser._id.toString(),
      date: "2024-06-12",
      start: "08:30",
      end: "15:00",
      approved: false
    }
  ]);
}

// Chloe Park 스케줄
var chloeUser = db.signupusers.findOne({name: "Chloe Park"});
if (chloeUser) {
  db.schedules.insertMany([
    {
      userId: chloeUser._id.toString(),
      date: "2024-06-08",
      start: "17:00",
      end: "22:30",
      approved: false
    },
    {
      userId: chloeUser._id.toString(),
      date: "2024-06-09",
      start: "13:00",
      end: "18:00",
      approved: false
    },
    {
      userId: chloeUser._id.toString(),
      date: "2024-06-10",
      start: "08:30",
      end: "16:30",
      approved: false
    },
    {
      userId: chloeUser._id.toString(),
      date: "2024-06-11",
      start: "08:30",
      end: "16:30",
      approved: false
    },
    {
      userId: chloeUser._id.toString(),
      date: "2024-06-12",
      start: "17:00",
      end: "21:00",
      approved: false
    }
  ]);
}

// Samantha Ro 스케줄
var samanthaUser = db.signupusers.findOne({name: "Samantha Ro"});
if (samanthaUser) {
  db.schedules.insertMany([
    {
      userId: samanthaUser._id.toString(),
      date: "2024-06-08",
      start: "15:00",
      end: "22:30",
      approved: false
    },
    {
      userId: samanthaUser._id.toString(),
      date: "2024-06-09",
      start: "10:30",
      end: "18:00",
      approved: false
    },
    {
      userId: samanthaUser._id.toString(),
      date: "2024-06-10",
      start: "08:30",
      end: "15:00",
      approved: false
    },
    {
      userId: samanthaUser._id.toString(),
      date: "2024-06-11",
      start: "15:00",
      end: "22:30",
      approved: false
    },
    {
      userId: samanthaUser._id.toString(),
      date: "2024-06-14",
      start: "10:30",
      end: "15:00",
      approved: false
    }
  ]);
}

// Landon Mead 스케줄
var landonUser = db.signupusers.findOne({name: "Landon Mead"});
if (landonUser) {
  db.schedules.insertMany([
    {
      userId: landonUser._id.toString(),
      date: "2024-06-08",
      start: "08:30",
      end: "17:00",
      approved: false
    },
    {
      userId: landonUser._id.toString(),
      date: "2024-06-12",
      start: "08:30",
      end: "17:00",
      approved: false
    },
    {
      userId: landonUser._id.toString(),
      date: "2024-06-13",
      start: "08:30",
      end: "17:00",
      approved: false
    },
    {
      userId: landonUser._id.toString(),
      date: "2024-06-14",
      start: "08:30",
      end: "17:00",
      approved: false
    }
  ]);
}

// Tony 스케줄
var tonyUser = db.signupusers.findOne({name: "Tony"});
if (tonyUser) {
  db.schedules.insertMany([
    {
      userId: tonyUser._id.toString(),
      date: "2024-06-09",
      start: "13:00",
      end: "21:00",
      approved: false
    },
    {
      userId: tonyUser._id.toString(),
      date: "2024-06-10",
      start: "13:00",
      end: "21:00",
      approved: false
    },
    {
      userId: tonyUser._id.toString(),
      date: "2024-06-11",
      start: "13:00",
      end: "21:00",
      approved: false
    },
    {
      userId: tonyUser._id.toString(),
      date: "2024-06-12",
      start: "13:00",
      end: "21:00",
      approved: false
    },
    {
      userId: tonyUser._id.toString(),
      date: "2024-06-13",
      start: "08:30",
      end: "12:00",
      approved: false
    }
  ]);
}

// Cody Redmond 스케줄
var codyUser = db.signupusers.findOne({name: "Cody Redmond"});
if (codyUser) {
  db.schedules.insertMany([
    {
      userId: codyUser._id.toString(),
      date: "2024-06-08",
      start: "08:30",
      end: "14:00",
      approved: false
    },
    {
      userId: codyUser._id.toString(),
      date: "2024-06-09",
      start: "08:30",
      end: "14:00",
      approved: false
    },
    {
      userId: codyUser._id.toString(),
      date: "2024-06-11",
      start: "09:00",
      end: "16:30",
      approved: false
    },
    {
      userId: codyUser._id.toString(),
      date: "2024-06-13",
      start: "09:00",
      end: "16:30",
      approved: false
    },
    {
      userId: codyUser._id.toString(),
      date: "2024-06-14",
      start: "08:30",
      end: "14:00",
      approved: false
    }
  ]);
}

// Karen Aguilar 스케줄
var karenUser = db.signupusers.findOne({name: "Karen Aguilar"});
if (karenUser) {
  db.schedules.insertMany([
    {
      userId: karenUser._id.toString(),
      date: "2024-06-08",
      start: "16:30",
      end: "22:30",
      approved: false
    },
    {
      userId: karenUser._id.toString(),
      date: "2024-06-12",
      start: "16:30",
      end: "22:30",
      approved: false
    },
    {
      userId: karenUser._id.toString(),
      date: "2024-06-13",
      start: "16:30",
      end: "22:30",
      approved: false
    },
    {
      userId: karenUser._id.toString(),
      date: "2024-06-14",
      start: "16:30",
      end: "22:30",
      approved: false
    }
  ]);
}

// Irene 스케줄
var ireneUser = db.signupusers.findOne({name: "Irene"});
if (ireneUser) {
  db.schedules.insertMany([
    {
      userId: ireneUser._id.toString(),
      date: "2024-06-09",
      start: "08:30",
      end: "14:00",
      approved: false
    },
    {
      userId: ireneUser._id.toString(),
      date: "2024-06-10",
      start: "08:30",
      end: "14:00",
      approved: false
    },
    {
      userId: ireneUser._id.toString(),
      date: "2024-06-11",
      start: "15:00",
      end: "22:30",
      approved: false
    },
    {
      userId: ireneUser._id.toString(),
      date: "2024-06-13",
      start: "12:00",
      end: "18:00",
      approved: false
    },
    {
      userId: ireneUser._id.toString(),
      date: "2024-06-14",
      start: "08:30",
      end: "12:00",
      approved: false
    }
  ]);
}

// Rachel Lee 스케줄
var rachelUser = db.signupusers.findOne({name: "Rachel Lee"});
if (rachelUser) {
  db.schedules.insertMany([
    {
      userId: rachelUser._id.toString(),
      date: "2024-06-09",
      start: "15:00",
      end: "22:30",
      approved: false
    },
    {
      userId: rachelUser._id.toString(),
      date: "2024-06-10",
      start: "15:00",
      end: "22:30",
      approved: false
    },
    {
      userId: rachelUser._id.toString(),
      date: "2024-06-12",
      start: "15:00",
      end: "22:30",
      approved: false
    },
    {
      userId: rachelUser._id.toString(),
      date: "2024-06-14",
      start: "15:00",
      end: "22:30",
      approved: false
    }
  ]);
}

// 삽입 완료 확인
print("스케줄 데이터 삽입 완료!");
db.schedules.countDocuments(); 