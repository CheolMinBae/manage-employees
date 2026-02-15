import { GET, POST, PUT, DELETE } from '@/app/api/users/route'

// Mock DB connection
jest.mock('@libs/db', () => jest.fn())

// Mock models
const mockUser = {
  _id: 'user-id-1',
  name: 'John Doe',
  email: 'john@example.com',
  password: '1234',
  position: 'employee',
  userType: ['Barista'],
  corp: 'TestCorp',
  eid: '001',
  category: 'Full-time',
  isFirstLogin: true,
  managedCorps: [],
}

jest.mock('@models/SignupUser', () => {
  const find = jest.fn()
  const findById = jest.fn()
  const findOne = jest.fn()
  const findByIdAndUpdate = jest.fn()
  const findByIdAndDelete = jest.fn()
  const save = jest.fn()

  const Model: any = jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: save,
  }))
  Model.find = find
  Model.findById = findById
  Model.findOne = findOne
  Model.findByIdAndUpdate = findByIdAndUpdate
  Model.findByIdAndDelete = findByIdAndDelete
  Model._save = save

  return { __esModule: true, default: Model }
})

jest.mock('@models/Schedule', () => {
  const Model: any = {}
  Model.deleteMany = jest.fn()
  return { __esModule: true, default: Model }
})

import SignupUser from '@models/SignupUser'
import Schedule from '@models/Schedule'

function createRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/users', () => {
  it('should return all users', async () => {
    ;(SignupUser.find as jest.Mock).mockResolvedValue([mockUser])

    const req = createRequest('http://localhost/api/users')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].name).toBe('John Doe')
  })

  it('should return a specific user by id', async () => {
    ;(SignupUser.findById as jest.Mock).mockResolvedValue(mockUser)

    const req = createRequest('http://localhost/api/users?id=user-id-1')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.email).toBe('john@example.com')
  })

  it('should return 404 for non-existent user', async () => {
    ;(SignupUser.findById as jest.Mock).mockResolvedValue(null)

    const req = createRequest('http://localhost/api/users?id=non-existent')
    const res = await GET(req)

    expect(res.status).toBe(404)
  })
})

describe('POST /api/users', () => {
  it('should create a new user', async () => {
    ;(SignupUser.findOne as jest.Mock).mockResolvedValue(null)
    ;(SignupUser as any)._save.mockResolvedValue(undefined)

    const req = createRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Jane',
        email: 'jane@example.com',
        password: '1234',
        position: 'employee',
        userType: ['Barista'],
        corp: 'TestCorp',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('should return 400 if required fields are missing', async () => {
    const req = createRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Jane' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 409 if email already exists', async () => {
    ;(SignupUser.findOne as jest.Mock).mockResolvedValue(mockUser)

    const req = createRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Jane',
        email: 'john@example.com',
        password: '1234',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})

describe('PUT /api/users', () => {
  it('should update user info', async () => {
    ;(SignupUser.findOne as jest.Mock).mockResolvedValue(null)
    ;(SignupUser.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      ...mockUser,
      name: 'John Updated',
    })

    const req = createRequest('http://localhost/api/users?id=user-id-1', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'John Updated',
        email: 'john@example.com',
        position: 'employee',
      }),
    })

    const res = await PUT(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.name).toBe('John Updated')
  })

  it('should return 400 if id is missing', async () => {
    const req = createRequest('http://localhost/api/users', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Test' }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('should reset password when only password is provided', async () => {
    ;(SignupUser.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      ...mockUser,
      password: 'newpass',
      isFirstLogin: true,
    })

    const req = createRequest('http://localhost/api/users?id=user-id-1', {
      method: 'PUT',
      body: JSON.stringify({ password: 'newpass' }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(200)
    expect(SignupUser.findByIdAndUpdate).toHaveBeenCalledWith(
      'user-id-1',
      expect.objectContaining({ password: 'newpass', isFirstLogin: true }),
      { new: true }
    )
  })

  it('should return 409 if email conflicts with another user', async () => {
    ;(SignupUser.findOne as jest.Mock).mockResolvedValue({ _id: 'other-id' })

    const req = createRequest('http://localhost/api/users?id=user-id-1', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'John',
        email: 'taken@example.com',
      }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(409)
  })
})

describe('DELETE /api/users', () => {
  it('should delete user and their schedules', async () => {
    ;(SignupUser.findById as jest.Mock).mockResolvedValue(mockUser)
    ;(Schedule.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 3 })
    ;(SignupUser.findByIdAndDelete as jest.Mock).mockResolvedValue(mockUser)

    const req = createRequest('http://localhost/api/users?id=user-id-1', {
      method: 'DELETE',
    })

    const res = await DELETE(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(Schedule.deleteMany).toHaveBeenCalledWith({ userId: 'user-id-1' })
    expect(data.message).toContain('deleted successfully')
  })

  it('should return 400 if id is missing', async () => {
    const req = createRequest('http://localhost/api/users', {
      method: 'DELETE',
    })

    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it('should return 404 if user not found', async () => {
    ;(SignupUser.findById as jest.Mock).mockResolvedValue(null)

    const req = createRequest('http://localhost/api/users?id=non-existent', {
      method: 'DELETE',
    })

    const res = await DELETE(req)
    expect(res.status).toBe(404)
  })
})
