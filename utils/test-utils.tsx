import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { baselightTheme as theme } from './theme/DefaultColors'

// 목 데이터는 별도 파일에서 re-export
export {
  mockSession,
  mockEmployeeSession,
  mockWeeklyScheduleData,
  mockHourlyData,
  mockFetchResponses,
} from './test-fixtures'

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

// 테스트 헬퍼 함수
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
