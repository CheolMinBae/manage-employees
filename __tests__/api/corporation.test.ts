import { GET, POST, PUT, DELETE } from '@/app/api/corporation/route'

jest.mock('@libs/mongodb', () => ({
  connectDB: jest.fn(),
}))

const mockCorp = {
  _id: 'corp-id-1',
  name: 'TestCorp',
  description: 'Test corporation',
  businessDayStartHour: 8,
  businessDayEndHour: 22,
}

jest.mock('@models/Corporation', () => {
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

import Corporation from '@models/Corporation'

function createRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/corporation', () => {
  it('should return all corporations', async () => {
    ;(Corporation.find as jest.Mock).mockResolvedValue([mockCorp])

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].name).toBe('TestCorp')
  })
})

describe('POST /api/corporation', () => {
  it('should create a new corporation', async () => {
    ;(Corporation.findOne as jest.Mock).mockResolvedValue(null)
    ;(Corporation as any)._save.mockResolvedValue(undefined)

    const req = createRequest('http://localhost/api/corporation', {
      method: 'POST',
      body: JSON.stringify({
        name: 'NewCorp',
        description: 'New',
        businessDayStartHour: 9,
        businessDayEndHour: 21,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('should return 400 if name is missing', async () => {
    const req = createRequest('http://localhost/api/corporation', {
      method: 'POST',
      body: JSON.stringify({ description: 'No name' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 409 if name already exists', async () => {
    ;(Corporation.findOne as jest.Mock).mockResolvedValue(mockCorp)

    const req = createRequest('http://localhost/api/corporation', {
      method: 'POST',
      body: JSON.stringify({ name: 'TestCorp' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})

describe('PUT /api/corporation', () => {
  it('should update a corporation', async () => {
    ;(Corporation.findOne as jest.Mock).mockResolvedValue(null)
    ;(Corporation.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      ...mockCorp,
      name: 'UpdatedCorp',
    })

    const req = createRequest('http://localhost/api/corporation', {
      method: 'PUT',
      body: JSON.stringify({
        _id: 'corp-id-1',
        name: 'UpdatedCorp',
        description: 'Updated',
      }),
    })

    const res = await PUT(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.name).toBe('UpdatedCorp')
  })

  it('should return 400 if id or name is missing', async () => {
    const req = createRequest('http://localhost/api/corporation', {
      method: 'PUT',
      body: JSON.stringify({ description: 'No id or name' }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('should return 409 if name conflicts', async () => {
    ;(Corporation.findOne as jest.Mock).mockResolvedValue({ _id: 'other-id' })

    const req = createRequest('http://localhost/api/corporation', {
      method: 'PUT',
      body: JSON.stringify({
        _id: 'corp-id-1',
        name: 'Taken',
      }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(409)
  })

  it('should return 404 if corporation not found', async () => {
    ;(Corporation.findOne as jest.Mock).mockResolvedValue(null)
    ;(Corporation.findByIdAndUpdate as jest.Mock).mockResolvedValue(null)

    const req = createRequest('http://localhost/api/corporation', {
      method: 'PUT',
      body: JSON.stringify({
        _id: 'non-existent',
        name: 'Test',
      }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/corporation', () => {
  it('should delete a corporation', async () => {
    ;(Corporation.findByIdAndDelete as jest.Mock).mockResolvedValue(mockCorp)

    const req = createRequest('http://localhost/api/corporation', {
      method: 'DELETE',
      body: JSON.stringify({ _id: 'corp-id-1' }),
    })

    const res = await DELETE(req)
    expect(res.status).toBe(200)
  })

  it('should return 400 if id is missing', async () => {
    const req = createRequest('http://localhost/api/corporation', {
      method: 'DELETE',
      body: JSON.stringify({}),
    })

    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it('should return 404 if corporation not found', async () => {
    ;(Corporation.findByIdAndDelete as jest.Mock).mockResolvedValue(null)

    const req = createRequest('http://localhost/api/corporation', {
      method: 'DELETE',
      body: JSON.stringify({ _id: 'non-existent' }),
    })

    const res = await DELETE(req)
    expect(res.status).toBe(404)
  })
})
