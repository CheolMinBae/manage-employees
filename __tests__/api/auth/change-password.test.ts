import { POST } from '@/app/api/auth/change-password/route'

jest.mock('@libs/db', () => jest.fn())

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('new-hashed-password'),
}))

jest.mock('@models/SignupUser', () => {
  const Model: any = {}
  Model.findOne = jest.fn()
  Model.findByIdAndUpdate = jest.fn()
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

describe('POST /api/auth/change-password', () => {
  const userWithHashedPassword = {
    _id: 'user-id-1',
    email: 'john@example.com',
    password: '$2a$12$hashedpassword',
  }

  const userWithPlainPassword = {
    _id: 'user-id-2',
    email: 'jane@example.com',
    password: '1q2w3e4r',
  }

  it('should change password for user with hashed password', async () => {
    ;(SignupUser.findOne as jest.Mock).mockResolvedValue(userWithHashedPassword)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(SignupUser.findByIdAndUpdate as jest.Mock).mockResolvedValue({})

    const req = createRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'john@example.com',
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
      }),
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toBe('Password changed successfully.')
    expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 12)
  })

  it('should handle first login password change', async () => {
    ;(SignupUser.findOne as jest.Mock).mockResolvedValue(userWithPlainPassword)
    ;(SignupUser.findByIdAndUpdate as jest.Mock).mockResolvedValue({})

    const req = createRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'jane@example.com',
        currentPassword: '1q2w3e4r',
        newPassword: 'newpass123',
        isFirstLogin: true,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('should return 400 if required fields are missing', async () => {
    const req = createRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'john@example.com' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 400 if new password is too short', async () => {
    const req = createRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'john@example.com',
        currentPassword: 'oldpass',
        newPassword: '12345',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 404 if user not found', async () => {
    ;(SignupUser.findOne as jest.Mock).mockResolvedValue(null)

    const req = createRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nobody@example.com',
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('should return 401 if current password is incorrect', async () => {
    ;(SignupUser.findOne as jest.Mock).mockResolvedValue(userWithHashedPassword)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

    const req = createRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'john@example.com',
        currentPassword: 'wrongpass',
        newPassword: 'newpass123',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should handle plain text password comparison', async () => {
    ;(SignupUser.findOne as jest.Mock).mockResolvedValue(userWithPlainPassword)
    ;(SignupUser.findByIdAndUpdate as jest.Mock).mockResolvedValue({})

    const req = createRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'jane@example.com',
        currentPassword: '1q2w3e4r',
        newPassword: 'newpass123',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
