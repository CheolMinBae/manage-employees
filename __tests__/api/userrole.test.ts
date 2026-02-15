import { GET, POST, PUT, DELETE } from '@/app/api/userrole/route'

jest.mock('@libs/db', () => jest.fn())

const mockRole = {
  _id: 'role-id-1',
  key: 'barista',
  name: 'Barista',
  description: 'Coffee maker',
  permissions: ['schedule:view', 'schedule:create'],
}

jest.mock('@models/UserRole', () => {
  const find = jest.fn()
  const findOne = jest.fn()
  const findByIdAndUpdate = jest.fn()
  const findByIdAndDelete = jest.fn()
  const save = jest.fn()

  const Model: any = jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: save,
  }))
  Model.find = find
  Model.findOne = findOne
  Model.findByIdAndUpdate = findByIdAndUpdate
  Model.findByIdAndDelete = findByIdAndDelete
  Model._save = save

  return { __esModule: true, default: Model }
})

import UserRole from '@models/UserRole'

function createRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/userrole', () => {
  it('should return all user roles', async () => {
    ;(UserRole.find as jest.Mock).mockResolvedValue([mockRole])

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].key).toBe('barista')
  })
})

describe('POST /api/userrole', () => {
  it('should create a new role', async () => {
    ;(UserRole.findOne as jest.Mock).mockResolvedValue(null)
    ;(UserRole as any)._save.mockResolvedValue(undefined)

    const req = createRequest('http://localhost/api/userrole', {
      method: 'POST',
      body: JSON.stringify({
        key: 'manager',
        name: 'Manager',
        description: 'Store manager',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('should return 400 if key or name is missing', async () => {
    const req = createRequest('http://localhost/api/userrole', {
      method: 'POST',
      body: JSON.stringify({ description: 'Missing key and name' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 409 if key already exists', async () => {
    ;(UserRole.findOne as jest.Mock).mockResolvedValue(mockRole)

    const req = createRequest('http://localhost/api/userrole', {
      method: 'POST',
      body: JSON.stringify({ key: 'barista', name: 'Barista' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})

describe('PUT /api/userrole', () => {
  it('should update a role', async () => {
    ;(UserRole.findOne as jest.Mock).mockResolvedValue(null)
    ;(UserRole.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      ...mockRole,
      name: 'Senior Barista',
    })

    const req = createRequest('http://localhost/api/userrole', {
      method: 'PUT',
      body: JSON.stringify({
        _id: 'role-id-1',
        key: 'barista',
        name: 'Senior Barista',
      }),
    })

    const res = await PUT(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.name).toBe('Senior Barista')
  })

  it('should return 400 if required fields are missing', async () => {
    const req = createRequest('http://localhost/api/userrole', {
      method: 'PUT',
      body: JSON.stringify({ _id: 'role-id-1' }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('should return 409 if key conflicts', async () => {
    ;(UserRole.findOne as jest.Mock).mockResolvedValue({ _id: 'other-id' })

    const req = createRequest('http://localhost/api/userrole', {
      method: 'PUT',
      body: JSON.stringify({
        _id: 'role-id-1',
        key: 'taken-key',
        name: 'Test',
      }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(409)
  })

  it('should return 404 if role not found', async () => {
    ;(UserRole.findOne as jest.Mock).mockResolvedValue(null)
    ;(UserRole.findByIdAndUpdate as jest.Mock).mockResolvedValue(null)

    const req = createRequest('http://localhost/api/userrole', {
      method: 'PUT',
      body: JSON.stringify({
        _id: 'non-existent',
        key: 'test',
        name: 'Test',
      }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/userrole', () => {
  it('should delete a role', async () => {
    ;(UserRole.findByIdAndDelete as jest.Mock).mockResolvedValue(mockRole)

    const req = createRequest('http://localhost/api/userrole', {
      method: 'DELETE',
      body: JSON.stringify({ _id: 'role-id-1' }),
    })

    const res = await DELETE(req)
    expect(res.status).toBe(200)
  })

  it('should return 400 if id is missing', async () => {
    const req = createRequest('http://localhost/api/userrole', {
      method: 'DELETE',
      body: JSON.stringify({}),
    })

    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it('should return 404 if role not found', async () => {
    ;(UserRole.findByIdAndDelete as jest.Mock).mockResolvedValue(null)

    const req = createRequest('http://localhost/api/userrole', {
      method: 'DELETE',
      body: JSON.stringify({ _id: 'non-existent' }),
    })

    const res = await DELETE(req)
    expect(res.status).toBe(404)
  })
})
