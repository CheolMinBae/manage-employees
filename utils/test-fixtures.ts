/**
 * 테스트용 목(mock) 데이터 모음
 * test-utils.tsx에서 분리됨
 */

// 세션 데이터
export const mockSession = {
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    position: 'admin',
    userType: 'Admin',
    corp: 'Test Corp',
    eid: '123',
  },
  expires: '2024-12-31',
}

export const mockEmployeeSession = {
  user: {
    id: 'test-employee-id',
    name: 'Test Employee',
    email: 'employee@example.com',
    position: 'employee',
    userType: 'Barista',
    corp: 'Test Corp',
    eid: '456',
  },
  expires: '2024-12-31',
}

// 주간 스케줄 데이터
export const mockWeeklyScheduleData = [
  {
    userId: 'user1',
    name: 'John Doe',
    position: ['Barista', 'Cashier'],
    corp: 'Starbucks',
    eid: 123,
    category: 'Full-time',
    shifts: [
      {
        date: '2024-01-01',
        slots: [
          {
            _id: 'slot1',
            start: '09:00',
            end: '17:00',
            status: 'approved' as const,
          },
        ],
      },
      {
        date: '2024-01-02',
        slots: [
          {
            _id: 'slot2',
            start: '10:00',
            end: '18:00',
            status: 'pending' as const,
          },
        ],
      },
    ],
  },
  {
    userId: 'user2',
    name: 'Jane Smith',
    position: 'Manager',
    corp: 'Starbucks',
    eid: 456,
    category: 'Part-time',
    shifts: [
      {
        date: '2024-01-01',
        slots: [],
      },
      {
        date: '2024-01-02',
        slots: [
          {
            _id: 'slot3',
            start: '08:00',
            end: '16:00',
            status: 'approved' as const,
          },
        ],
      },
    ],
  },
]

// 시간별 인원 데이터
export const mockHourlyData = {
  date: '2024-01-01',
  hourlyData: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    pendingCount: hour >= 8 && hour <= 20 ? Math.floor(Math.random() * 5) : 0,
    approvedCount: hour >= 8 && hour <= 20 ? Math.floor(Math.random() * 8) : 0,
    employees: [],
  })),
  employeeSchedules: [
    {
      userId: 'user1',
      name: 'John Doe',
      position: 'Barista',
      corp: 'Starbucks',
      eid: 123,
      category: 'Full-time',
      userType: 'Barista',
      hourlyStatus: Array.from({ length: 24 }, (_, hour) => ({
        isWorking: hour >= 9 && hour <= 17,
        workingRatio: hour >= 9 && hour <= 17 ? 1 : 0,
        shift: hour >= 9 && hour <= 17 ? '09:00-18:00' : null,
        approved: hour >= 9 && hour <= 17 ? true : false,
      })),
      hasSchedule: true,
    },
    {
      userId: 'user2',
      name: 'Jane Smith',
      position: 'Manager',
      corp: 'Starbucks',
      eid: 456,
      category: 'Part-time',
      userType: 'Manager',
      hourlyStatus: Array.from({ length: 24 }, (_, hour) => ({
        isWorking: hour >= 10 && hour <= 16,
        workingRatio: hour >= 10 && hour <= 16 ? 0.5 : 0,
        shift: hour >= 10 && hour <= 16 ? '10:00-16:00' : null,
        approved: hour >= 10 && hour <= 16 ? false : false,
      })),
      hasSchedule: true,
    },
  ],
}

// API 응답 mock
export const mockFetchResponses = {
  schedules: {
    ok: true,
    json: async () => mockWeeklyScheduleData,
  },
  hourlySchedules: {
    ok: true,
    json: async () => mockHourlyData,
  },
  scheduleTemplates: {
    ok: true,
    json: async () => [
      {
        _id: 'template1',
        name: 'morning-shift',
        displayName: 'Morning Shift',
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
        order: 1,
      },
      {
        _id: 'template2',
        name: 'evening-shift',
        displayName: 'Evening Shift',
        startTime: '13:00',
        endTime: '21:00',
        isActive: true,
        order: 2,
      },
    ],
  },
  download: {
    ok: true,
    blob: async () => new Blob(['mock excel data']),
  },
}
