import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import theme from './theme'

// Mock session data
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

// Mock schedule data for WeeklyScheduleTable
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

// Mock hourly data for HourlyStaffingTable
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

// Mock API responses
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

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Helper functions for tests
export const createMockDate = (dateString: string) => {
  const mockDate = new Date(dateString)
  const spy = jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)
  return spy
}

export const setupFetchMock = (responses: Record<string, any>) => {
  const fetchMock = global.fetch as jest.Mock
  fetchMock.mockImplementation((url: string) => {
    for (const [key, response] of Object.entries(responses)) {
      if (url.includes(key)) {
        return Promise.resolve(response)
      }
    }
    return Promise.reject(new Error(`Unhandled fetch: ${url}`))
  })
  return fetchMock
}

export const clearAllMocks = () => {
  jest.clearAllMocks()
  ;(global.fetch as jest.Mock).mockClear()
} 