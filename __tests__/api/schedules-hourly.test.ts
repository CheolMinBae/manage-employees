import { GET } from '@/app/api/schedules/hourly/route'
import { NextRequest } from 'next/server'

jest.mock('@libs/db', () => jest.fn())

// dayjs의 기본 날짜를 2024-01-15로 고정
jest.mock('dayjs', () => {
  const actual = jest.requireActual('dayjs');
  const mocked = (...args: any[]) => {
    if (args.length === 0) return actual('2024-01-15');
    return actual(...args);
  };
  // 모든 static 메서드 복사
  Object.keys(actual).forEach((key: string) => {
    (mocked as any)[key] = (actual as any)[key];
  });
  mocked.default = mocked;
  mocked.__esModule = true;
  return mocked;
});

// Mock Schedule model
jest.mock('@models/Schedule', () => {
  const leanMock = jest.fn()
  const find = jest.fn().mockReturnValue({ lean: leanMock })
  const Model: any = {}
  Model.find = find
  Model._leanMock = leanMock
  return { __esModule: true, default: Model }
})

// Mock SignupUser model
jest.mock('@models/SignupUser', () => {
  const leanMock = jest.fn()
  const selectMock = jest.fn().mockReturnValue({ lean: leanMock })
  const find = jest.fn().mockReturnValue({ select: selectMock })
  const Model: any = {}
  Model.find = find
  Model._selectMock = selectMock
  Model._leanMock = leanMock
  return { __esModule: true, default: Model }
})

// Mock Corporation model
jest.mock('@models/Corporation', () => {
  const leanMock = jest.fn().mockResolvedValue(null)
  const findOne = jest.fn().mockReturnValue({ lean: leanMock })
  const Model: any = {}
  Model.findOne = findOne
  Model._leanMock = leanMock
  return { __esModule: true, default: Model }
})

import Schedule from '@models/Schedule'
import SignupUser from '@models/SignupUser'
import Corporation from '@models/Corporation'

function createNextRequest(url: string): NextRequest {
  return new NextRequest(new Request(url))
}

const mockUsers = [
  {
    _id: { toString: () => 'user-1' },
    name: 'John Doe',
    position: 'employee',
    corp: 'TestCorp',
    eid: '001',
    category: 'Full-time',
    userType: ['Barista'],
  },
  {
    _id: { toString: () => 'user-2' },
    name: 'Jane Smith',
    position: 'employee',
    corp: 'TestCorp',
    eid: '002',
    category: 'Part-time',
    userType: 'Manager',
  },
]

const mockSchedules = [
  {
    userId: 'user-1',
    date: '2024-01-15',
    start: '09:00',
    end: '17:00',
    approved: true,
  },
  {
    userId: 'user-2',
    date: '2024-01-15',
    start: '10:00',
    end: '16:00',
    approved: false,
  },
]

beforeEach(() => {
  jest.clearAllMocks()

  // Default mocks
  ;(Schedule.find as jest.Mock).mockReturnValue({
    lean: jest.fn().mockResolvedValue(mockSchedules),
  })
  ;(SignupUser.find as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockUsers),
    }),
  })
})

describe('GET /api/schedules/hourly', () => {
  it('should return hourly data for a given date', async () => {
    const req = createNextRequest('http://localhost/api/schedules/hourly?date=2024-01-15')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.date).toBe('2024-01-15')
    expect(data.hourlyData).toBeDefined()
    expect(data.employeeSchedules).toBeDefined()
  })

  it('should return hourly data with default 20 hours (3am-10pm) when no corp', async () => {
    const req = createNextRequest('http://localhost/api/schedules/hourly?date=2024-01-15')
    const res = await GET(req)
    const data = await res.json()

    // 기본 businessStartHour=3, businessEndHour=23, totalHours=20
    expect(data.hourlyData).toHaveLength(20)
    expect(data.hourlyData[0].hour).toBe(3)
    expect(data.hourlyData[19].hour).toBe(22)
    expect(data.businessHours).toEqual({ start: 3, end: 23 })
  })

  it('should return dynamic hours based on corp business hours', async () => {
    ;(Corporation.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        name: 'TestCorp',
        businessDayStartHour: 8,
        businessDayEndHour: 24,
      }),
    })

    const req = createNextRequest('http://localhost/api/schedules/hourly?date=2024-01-15&corp=TestCorp')
    const res = await GET(req)
    const data = await res.json()

    // 8~24 = 16시간
    expect(data.hourlyData).toHaveLength(16)
    expect(data.hourlyData[0].hour).toBe(8)
    expect(data.hourlyData[15].hour).toBe(23)
    expect(data.businessHours).toEqual({ start: 8, end: 24 })
  })

  it('should count working employees per hour correctly', async () => {
    const req = createNextRequest('http://localhost/api/schedules/hourly?date=2024-01-15')
    const res = await GET(req)
    const data = await res.json()

    // 9am: both user-1 (09:00-17:00) and user-2 haven't started yet at exact 9 for user-2
    // user-1 starts at 09:00 so 09:00 is included
    // user-2 starts at 10:00 so 09:00 is NOT included
    const hour9 = data.hourlyData.find((h: any) => h.hour === 9)
    expect(hour9.count).toBe(1) // Only user-1

    // 10am: both user-1 and user-2 are working
    const hour10 = data.hourlyData.find((h: any) => h.hour === 10)
    expect(hour10.count).toBe(2)

    // 16am: only user-1 (user-2 ends at 16:00, so 16:00 is excluded)
    const hour16 = data.hourlyData.find((h: any) => h.hour === 16)
    expect(hour16.count).toBe(1) // Only user-1

    // 17am: no one (user-1 ends at 17:00, excluded)
    const hour17 = data.hourlyData.find((h: any) => h.hour === 17)
    expect(hour17.count).toBe(0)
  })

  it('should include employee details in hourly data', async () => {
    const req = createNextRequest('http://localhost/api/schedules/hourly?date=2024-01-15')
    const res = await GET(req)
    const data = await res.json()

    const hour10 = data.hourlyData.find((h: any) => h.hour === 10)
    expect(hour10.employees).toHaveLength(2)
    expect(hour10.employees[0]).toHaveProperty('name')
    expect(hour10.employees[0]).toHaveProperty('shift')
    expect(hour10.employees[0]).toHaveProperty('userType')
  })

  it('should return employee schedules with hourly status', async () => {
    const req = createNextRequest('http://localhost/api/schedules/hourly?date=2024-01-15')
    const res = await GET(req)
    const data = await res.json()

    expect(data.employeeSchedules).toHaveLength(2)

    const john = data.employeeSchedules.find((e: any) => e.name === 'John Doe')
    expect(john).toBeDefined()
    expect(john.hourlyStatus).toHaveLength(24)
    expect(john.hasSchedule).toBe(true)

    // John works 09:00-17:00, so hour 9 should be working
    expect(john.hourlyStatus[9].isWorking).toBe(true)
    expect(john.hourlyStatus[9].workingRatio).toBe(1)
    expect(john.hourlyStatus[9].approved).toBe(true)

    // Hour 8 should NOT be working for John
    expect(john.hourlyStatus[8].isWorking).toBe(false)
    expect(john.hourlyStatus[8].workingRatio).toBe(0)
  })

  it('should calculate working ratio for partial hours', async () => {
    // User starts at 09:30 - so hour 9 is partial (0.5)
    ;(Schedule.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          userId: 'user-1',
          date: '2024-01-15',
          start: '09:30',
          end: '17:00',
          approved: true,
        },
      ]),
    })

    const req = createNextRequest('http://localhost/api/schedules/hourly?date=2024-01-15')
    const res = await GET(req)
    const data = await res.json()

    const john = data.employeeSchedules.find((e: any) => e.name === 'John Doe')
    // Hour 9: 09:30-10:00 = 30min / 60min = 0.5
    expect(john.hourlyStatus[9].isWorking).toBe(true)
    expect(john.hourlyStatus[9].workingRatio).toBe(0.5)
  })

  it('should sort employees: scheduled first, then by name', async () => {
    // user-2 has no schedules
    ;(Schedule.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          userId: 'user-1',
          date: '2024-01-15',
          start: '09:00',
          end: '17:00',
          approved: true,
        },
      ]),
    })

    const req = createNextRequest('http://localhost/api/schedules/hourly?date=2024-01-15')
    const res = await GET(req)
    const data = await res.json()

    // user-1 (has schedule) should come before user-2 (no schedule)
    expect(data.employeeSchedules[0].name).toBe('John Doe')
    expect(data.employeeSchedules[0].hasSchedule).toBe(true)
    expect(data.employeeSchedules[1].name).toBe('Jane Smith')
    expect(data.employeeSchedules[1].hasSchedule).toBe(false)
  })

  it('should handle single string userType (convert to joined string)', async () => {
    const req = createNextRequest('http://localhost/api/schedules/hourly?date=2024-01-15')
    const res = await GET(req)
    const data = await res.json()

    const jane = data.employeeSchedules.find((e: any) => e.name === 'Jane Smith')
    // userType was 'Manager' (string, not array) → should be converted
    expect(jane.userType).toBe('Manager')
  })

  it('should use default date when no date param provided', async () => {
    const req = createNextRequest('http://localhost/api/schedules/hourly')
    const res = await GET(req)
    const data = await res.json()

    // dayjs()는 2024-01-15를 반환하도록 mock됨
    expect(data.date).toBe('2024-01-15')
  })

  it('should return 500 on database error', async () => {
    ;(Schedule.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockRejectedValue(new Error('DB connection failed')),
    })

    const req = createNextRequest('http://localhost/api/schedules/hourly?date=2024-01-15')
    const res = await GET(req)

    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Failed to fetch hourly data')
  })

  it('should return empty data when no schedules exist', async () => {
    ;(Schedule.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    })

    const req = createNextRequest('http://localhost/api/schedules/hourly?date=2024-01-15')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    data.hourlyData.forEach((h: any) => {
      expect(h.count).toBe(0)
      expect(h.employees).toHaveLength(0)
    })
  })

  it('should filter out users with status deleted', async () => {
    const req = createNextRequest('http://localhost/api/schedules/hourly?date=2024-01-15')
    await GET(req)

    expect(SignupUser.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: { $ne: 'deleted' } })
    )
  })

  it('should filter users by corp when corp param is provided', async () => {
    ;(Corporation.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    })

    const req = createNextRequest('http://localhost/api/schedules/hourly?date=2024-01-15&corp=TestCorp')
    await GET(req)

    expect(SignupUser.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: { $ne: 'deleted' }, corp: 'TestCorp' })
    )
  })

  it('should handle schedule userId as ObjectId string comparison', async () => {
    // Simulates when schedule.userId is a string but user._id is ObjectId
    ;(Schedule.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          userId: 'user-1',
          date: '2024-01-15',
          start: '09:00',
          end: '17:00',
          approved: true,
        },
      ]),
    })

    const req = createNextRequest('http://localhost/api/schedules/hourly?date=2024-01-15')
    const res = await GET(req)
    const data = await res.json()

    const john = data.employeeSchedules.find((e: any) => e.userId === 'user-1')
    expect(john.hasSchedule).toBe(true)
    expect(john.hourlyStatus[9].isWorking).toBe(true)
  })
})
