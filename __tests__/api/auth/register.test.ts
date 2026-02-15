import { POST } from '@/app/api/auth/register/route'

jest.mock('@libs/db', () => jest.fn())

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}))

jest.mock('@models/SignupUser', () => {
  const findOne = jest.fn()
  const save = jest.fn()

  const Model: any = jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: save,
  }))
  Model.findOne = findOne
  Model._save = save

  return { __esModule: true, default: Model }
})

import SignupUser from '@models/SignupUser'
import bcrypt from 'bcryptjs'

function createRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /api/auth/register', () => {
  const validBody = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'secure123',
    position: 'employee',
    userType: 'Barista',
    corp: 'TestCorp',
    eid: '002',
    category: 'Full-time',
  }

  it('should register a new user', async () => {
    ;(SignupUser.findOne as jest.Mock).mockResolvedValue(null)
    ;(SignupUser as any)._save.mockResolvedValue(undefined)

    const req = createRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.message).toBe('Registration successful')
    expect(bcrypt.hash).toHaveBeenCalledWith('secure123', 10)
  })

  it('should return 400 if required fields are missing', async () => {
    const req = createRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Jane', email: 'jane@example.com' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 409 if email already exists', async () => {
    ;(SignupUser.findOne as jest.Mock).mockResolvedValue({ email: 'jane@example.com' })

    const req = createRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('should handle google-oauth password specially', async () => {
    ;(SignupUser.findOne as jest.Mock).mockResolvedValue(null)
    ;(SignupUser as any)._save.mockResolvedValue(undefined)

    const req = createRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, password: 'google-oauth' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    // Google OAuth users get random password hashed
    expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 10)
  })

  it('should convert single userType to array', async () => {
    ;(SignupUser.findOne as jest.Mock).mockResolvedValue(null)
    ;(SignupUser as any)._save.mockResolvedValue(undefined)

    const req = createRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })

    await POST(req)

    expect(SignupUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userType: ['Barista'],
      })
    )
  })
})
