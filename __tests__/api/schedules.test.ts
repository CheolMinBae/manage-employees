import { GET, POST, PUT, DELETE } from '@/app/api/schedules/route'
import { NextRequest } from 'next/server'

jest.mock('@libs/db', () => jest.fn())

jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: { name: 'Admin User' },
  }),
}))

jest.mock('@/libs/auth', () => ({
  authOptions: {},
}))

// Mock Schedule model
jest.mock('@models/Schedule', () => {
  const find = jest.fn()
  const findById = jest.fn()
  const findByIdAndUpdate = jest.fn()
  const findByIdAndDelete = jest.fn()
  const create = jest.fn()
  const deleteMany = jest.fn()

  // Chain support for .select().lean()
  const selectMock = jest.fn().mockReturnThis()
  const leanMock = jest.fn()

  const Model: any = {}
  Model.find = find
  Model.findById = findById
  Model.findByIdAndUpdate = findByIdAndUpdate
  Model.findByIdAndDelete = findByIdAndDelete
  Model.create = create
  Model.deleteMany = deleteMany
  Model._selectMock = selectMock
  Model._leanMock = leanMock

  return { __esModule: true, default: Model }
})

// Mock SignupUser model
jest.mock('@models/SignupUser', () => {
  const findById = jest.fn()
  const find = jest.fn()

  const selectMock = jest.fn().mockReturnThis()
  const leanMock = jest.fn()

  const Model: any = {}
  Model.findById = findById
  Model.find = find
  Model._selectMock = selectMock
  Model._leanMock = leanMock

  return { __esModule: true, default: Model }
})

// Mock Corporation model
jest.mock('@models/Corporation', () => {
  const Model: any = {}
  Model.findById = jest.fn()
  Model.findOne = jest.fn()
  return { __esModule: true, default: Model }
})

import Schedule from '@models/Schedule'
import SignupUser from '@models/SignupUser'
import Corporation from '@models/Corporation'

function createNextRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new Request(url, options))
}

beforeEach(() => {
  jest.clearAllMocks()

  // Default: no conflicts
  const selectChain = { lean: jest.fn().mockResolvedValue([]) }
  ;(Schedule.find as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue(selectChain),
    lean: jest.fn().mockResolvedValue([]),
  })

  // Default user for business window lookup
  ;(SignupUser.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'user-1',
        corp: 'TestCorp',
      }),
    }),
  })

  // Default corporation with business hours
  ;(Corporation.findOne as jest.Mock).mockReturnValue({
    lean: jest.fn().mockResolvedValue({
      name: 'TestCorp',
      businessDayStartHour: 6,
      businessDayEndHour: 24,
    }),
  })
  ;(Corporation.findById as jest.Mock).mockReturnValue({
    lean: jest.fn().mockResolvedValue(null),
  })
})

describe('POST /api/schedules', () => {
  it('should create a schedule', async () => {
    const newSchedule = {
      _id: 'sched-1',
      userId: 'user-1',
      date: '2024-01-15',
      start: '09:00',
      end: '17:00',
      userType: 'Barista',
    }
    ;(Schedule.create as jest.Mock).mockResolvedValue(newSchedule)

    const req = createNextRequest('http://localhost/api/schedules', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        date: '2024-01-15',
        start: '09:00',
        end: '17:00',
        userType: 'Barista',
      }),
    })

    const res = await POST(req)
    const data = await res.json()

    expect(data.userId).toBe('user-1')
    expect(data.start).toBe('09:00')
  })

  it('should return 400 if required fields are missing', async () => {
    const req = createNextRequest('http://localhost/api/schedules', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 400 for invalid time format', async () => {
    const req = createNextRequest('http://localhost/api/schedules', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        date: '2024-01-15',
        start: '25:00',
        end: '17:00',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 400 when end time is before start time', async () => {
    const req = createNextRequest('http://localhost/api/schedules', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        date: '2024-01-15',
        start: '17:00',
        end: '09:00',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 400 when schedule conflicts exist', async () => {
    const selectChain = {
      lean: jest.fn().mockResolvedValue([
        { _id: 'existing-1', start: '08:00', end: '16:00' },
      ]),
    }
    ;(Schedule.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue(selectChain),
      lean: jest.fn().mockResolvedValue([]),
    })

    const req = createNextRequest('http://localhost/api/schedules', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        date: '2024-01-15',
        start: '10:00',
        end: '14:00',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Schedule conflict detected')
  })

  it('should default userType to Barista if not provided', async () => {
    ;(Schedule.create as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      date: '2024-01-15',
      start: '09:00',
      end: '17:00',
      userType: 'Barista',
    })

    const req = createNextRequest('http://localhost/api/schedules', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        date: '2024-01-15',
        start: '09:00',
        end: '17:00',
      }),
    })

    const res = await POST(req)
    const data = await res.json()

    expect(data.userType).toBe('Barista')
  })
})

describe('PUT /api/schedules', () => {
  it('should update a schedule', async () => {
    ;(Schedule.findById as jest.Mock).mockResolvedValue({
      _id: 'sched-1',
      userId: 'user-1',
      date: '2024-01-15',
      start: '09:00',
      end: '17:00',
      approved: false,
    })
    ;(Schedule.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      _id: 'sched-1',
      userId: 'user-1',
      date: '2024-01-15',
      start: '10:00',
      end: '18:00',
    })

    const req = createNextRequest('http://localhost/api/schedules', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'sched-1',
        start: '10:00',
        end: '18:00',
      }),
    })

    const res = await PUT(req)
    const data = await res.json()

    expect(data.start).toBe('10:00')
  })

  it('should return 400 if id is missing', async () => {
    const req = createNextRequest('http://localhost/api/schedules', {
      method: 'PUT',
      body: JSON.stringify({ start: '10:00' }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('should return 404 if schedule not found', async () => {
    ;(Schedule.findById as jest.Mock).mockResolvedValue(null)

    const req = createNextRequest('http://localhost/api/schedules', {
      method: 'PUT',
      body: JSON.stringify({ id: 'non-existent', start: '10:00' }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(404)
  })

  it('should record approver info when approving', async () => {
    ;(Schedule.findById as jest.Mock).mockResolvedValue({
      _id: 'sched-1',
      userId: 'user-1',
      date: '2024-01-15',
      start: '09:00',
      end: '17:00',
      approved: false,
    })
    ;(Schedule.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      _id: 'sched-1',
      approved: true,
      approvedBy: 'Admin User',
    })

    const req = createNextRequest('http://localhost/api/schedules', {
      method: 'PUT',
      body: JSON.stringify({ id: 'sched-1', approved: true }),
    })

    const res = await PUT(req)

    expect(Schedule.findByIdAndUpdate).toHaveBeenCalledWith(
      'sched-1',
      expect.objectContaining({
        approved: true,
        approvedBy: 'Admin User',
      }),
      { new: true }
    )
  })

  it('should clear approval info when unapproving', async () => {
    ;(Schedule.findById as jest.Mock).mockResolvedValue({
      _id: 'sched-1',
      userId: 'user-1',
      date: '2024-01-15',
      start: '09:00',
      end: '17:00',
      approved: true,
    })
    ;(Schedule.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      _id: 'sched-1',
      approved: false,
    })

    const req = createNextRequest('http://localhost/api/schedules', {
      method: 'PUT',
      body: JSON.stringify({ id: 'sched-1', approved: false }),
    })

    const res = await PUT(req)

    expect(Schedule.findByIdAndUpdate).toHaveBeenCalledWith(
      'sched-1',
      expect.objectContaining({
        approved: false,
        approvedBy: null,
        approvedAt: null,
      }),
      { new: true }
    )
  })
})

describe('DELETE /api/schedules', () => {
  it('should delete a single schedule', async () => {
    ;(Schedule.findByIdAndDelete as jest.Mock).mockResolvedValue({
      _id: 'sched-1',
    })

    const req = createNextRequest(
      'http://localhost/api/schedules?id=sched-1',
      { method: 'DELETE' }
    )

    const res = await DELETE(req)
    const data = await res.json()

    expect(data.success).toBe(true)
  })

  it('should bulk delete schedules for a user on a date', async () => {
    ;(Schedule.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 3 })

    const req = createNextRequest(
      'http://localhost/api/schedules?userId=user-1&date=2024-01-15&deleteAll=true',
      { method: 'DELETE' }
    )

    const res = await DELETE(req)
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(data.deletedCount).toBe(3)
  })

  it('should return 400 if no id provided for single delete', async () => {
    const req = createNextRequest('http://localhost/api/schedules', {
      method: 'DELETE',
    })

    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it('should return 404 if schedule not found', async () => {
    ;(Schedule.findByIdAndDelete as jest.Mock).mockResolvedValue(null)

    const req = createNextRequest(
      'http://localhost/api/schedules?id=non-existent',
      { method: 'DELETE' }
    )

    const res = await DELETE(req)
    expect(res.status).toBe(404)
  })
})

describe('GET /api/schedules', () => {
  it('should return filtered schedules when userId is provided', async () => {
    const mockSchedules = [
      { userId: 'user-1', date: '2024-01-15', start: '09:00', end: '17:00' },
    ]
    ;(Schedule.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockSchedules),
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSchedules),
      }),
    })

    const req = createNextRequest(
      'http://localhost/api/schedules?userId=user-1'
    )

    const res = await GET(req)
    const data = await res.json()

    expect(Array.isArray(data)).toBe(true)
  })

  it('should return all schedules with user data when no filters', async () => {
    const mockSchedules = [
      {
        _id: 's1',
        userId: 'user-1',
        date: '2024-01-15',
        start: '09:00',
        end: '17:00',
        approved: true,
      },
    ]

    ;(Schedule.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSchedules),
      }),
    })

    ;(SignupUser.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'user-1',
            name: 'John',
            corp: 'TestCorp',
            eid: '001',
            category: 'Full-time',
            userType: ['Barista'],
          },
        ]),
      }),
    })

    const req = createNextRequest('http://localhost/api/schedules')

    const res = await GET(req)
    const data = await res.json()

    expect(Array.isArray(data)).toBe(true)
  })
})
