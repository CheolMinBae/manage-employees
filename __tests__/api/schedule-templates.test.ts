import { GET, POST, PUT, DELETE } from '@/app/api/schedule-templates/route'
import { NextRequest } from 'next/server'

jest.mock('@libs/db', () => jest.fn())

const mockTemplate = {
  _id: 'tmpl-id-1',
  name: 'morning-shift',
  displayName: 'Morning Shift',
  startTime: '09:00',
  endTime: '17:00',
  isActive: true,
  order: 1,
}

jest.mock('@models/ScheduleTemplate', () => {
  const sort = jest.fn().mockReturnThis()
  const lean = jest.fn()

  const Model: any = {}
  Model.find = jest.fn().mockReturnValue({ sort, lean: () => lean() })
  Model.create = jest.fn()
  Model.findByIdAndUpdate = jest.fn()
  Model.findByIdAndDelete = jest.fn()
  Model._sort = sort
  Model._lean = lean

  return { __esModule: true, default: Model }
})

import ScheduleTemplate from '@models/ScheduleTemplate'

function createNextRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new Request(url, options))
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/schedule-templates', () => {
  it('should return all templates sorted', async () => {
    ;(ScheduleTemplate as any)._lean.mockResolvedValue([mockTemplate])

    const res = await GET()
    const data = await res.json()

    expect(data).toHaveLength(1)
    expect(data[0].name).toBe('morning-shift')
  })
})

describe('POST /api/schedule-templates', () => {
  it('should create a new template', async () => {
    ;(ScheduleTemplate.create as jest.Mock).mockResolvedValue(mockTemplate)

    const req = createNextRequest('http://localhost/api/schedule-templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'morning-shift',
        displayName: 'Morning Shift',
        startTime: '09:00',
        endTime: '17:00',
      }),
    })

    const res = await POST(req)
    const data = await res.json()

    expect(data.name).toBe('morning-shift')
  })

  it('should return 400 if required fields are missing', async () => {
    const req = createNextRequest('http://localhost/api/schedule-templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 400 for invalid time format', async () => {
    const req = createNextRequest('http://localhost/api/schedule-templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'test',
        displayName: 'Test',
        startTime: '25:00',
        endTime: '17:00',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 400 if start time >= end time', async () => {
    const req = createNextRequest('http://localhost/api/schedule-templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'test',
        displayName: 'Test',
        startTime: '17:00',
        endTime: '09:00',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 400 for duplicate name', async () => {
    ;(ScheduleTemplate.create as jest.Mock).mockRejectedValue({ code: 11000 })

    const req = createNextRequest('http://localhost/api/schedule-templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'morning-shift',
        displayName: 'Morning',
        startTime: '09:00',
        endTime: '17:00',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/schedule-templates', () => {
  it('should update a template', async () => {
    ;(ScheduleTemplate.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      ...mockTemplate,
      displayName: 'Updated Morning',
    })

    const req = createNextRequest('http://localhost/api/schedule-templates', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'tmpl-id-1',
        displayName: 'Updated Morning',
      }),
    })

    const res = await PUT(req)
    const data = await res.json()

    expect(data.displayName).toBe('Updated Morning')
  })

  it('should return 400 if id is missing', async () => {
    const req = createNextRequest('http://localhost/api/schedule-templates', {
      method: 'PUT',
      body: JSON.stringify({ displayName: 'No ID' }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('should return 400 for invalid time format on update', async () => {
    const req = createNextRequest('http://localhost/api/schedule-templates', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'tmpl-id-1',
        startTime: 'invalid',
      }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('should return 404 if template not found', async () => {
    ;(ScheduleTemplate.findByIdAndUpdate as jest.Mock).mockResolvedValue(null)

    const req = createNextRequest('http://localhost/api/schedule-templates', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'non-existent',
        displayName: 'Test',
      }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/schedule-templates', () => {
  it('should delete a template', async () => {
    ;(ScheduleTemplate.findByIdAndDelete as jest.Mock).mockResolvedValue(mockTemplate)

    const req = createNextRequest(
      'http://localhost/api/schedule-templates?id=tmpl-id-1',
      { method: 'DELETE' }
    )

    const res = await DELETE(req)
    const data = await res.json()

    expect(data.success).toBe(true)
  })

  it('should return 400 if id is missing', async () => {
    const req = createNextRequest('http://localhost/api/schedule-templates', {
      method: 'DELETE',
    })

    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it('should return 404 if template not found', async () => {
    ;(ScheduleTemplate.findByIdAndDelete as jest.Mock).mockResolvedValue(null)

    const req = createNextRequest(
      'http://localhost/api/schedule-templates?id=non-existent',
      { method: 'DELETE' }
    )

    const res = await DELETE(req)
    expect(res.status).toBe(404)
  })
})
