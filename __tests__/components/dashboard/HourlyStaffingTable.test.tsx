/**
 * @jest-environment jsdom
 */
import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from 'next-auth/react'
import HourlyStaffingTable from '@/app/(DashboardLayout)/components/dashboard/HourlyStaffingTable'
import { render, setupFetchMock, mockHourlyData, mockSession, mockEmployeeSession, clearAllMocks, mockFetchResponses } from '@/utils/test-utils'

// Mock the child components
jest.mock('@/app/(DashboardLayout)/components/schedule/EditShiftDialog', () => {
  return function MockEditShiftDialog({ open, onClose }: any) {
    return open ? <div data-testid="edit-shift-dialog">Edit Shift Dialog</div> : null
  }
})

const defaultDate = new Date('2024-01-01')

describe('HourlyStaffingTable', () => {
  beforeEach(() => {
    clearAllMocks()
    setupFetchMock({
      '/api/schedules/hourly': mockFetchResponses.hourlySchedules,
      '/api/schedule-templates': mockFetchResponses.scheduleTemplates,
      '/api/schedules': {
        ok: true,
        json: async () => ({ success: true }),
      },
    })
    
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })
  })

  describe('Rendering', () => {
    it('renders the hourly staffing table with correct title', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        expect(screen.getByText('⏰ Hourly Staffing')).toBeInTheDocument()
      })
    })

    it('renders California timezone notice', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        expect(screen.getByText(/All times are displayed in California/)).toBeInTheDocument()
      })
    })

    it('renders employee names and information', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        expect(screen.getByText('John Doe (Barista)')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith (Manager)')).toBeInTheDocument()
      })
    })

    it('renders filter controls for admin', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        expect(screen.getByText('🔍 Filter Employees')).toBeInTheDocument()
        expect(screen.getByLabelText('Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Position')).toBeInTheDocument()
        expect(screen.getByLabelText('Company')).toBeInTheDocument()
      })
    })

    it('renders hour headers based on businessHours from API', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        // mock businessHours: { start: 3, end: 23 } → hours 3~22
        expect(screen.getByText('3 AM')).toBeInTheDocument()
        expect(screen.getByText('10 PM')).toBeInTheDocument()
        expect(screen.getByText('12 PM')).toBeInTheDocument()
      })
    })

    it('shows loading state initially', () => {
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      expect(screen.getByText('Loading staffing data...')).toBeInTheDocument()
    })
  })

  describe('Filtering', () => {
    it('filters employees by name', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Name')).toBeInTheDocument()
      })
      
      const nameInput = screen.getByLabelText('Name')
      await user.type(nameInput, 'John')
      
      await waitFor(() => {
        expect(screen.getByText(/Showing \d+ of \d+ employees/)).toBeInTheDocument()
      })
    })

    it('clears all filters when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        expect(screen.getByText('Clear')).toBeInTheDocument()
      })
      
      const nameInput = screen.getByLabelText('Name')
      await user.type(nameInput, 'test')
      
      const clearButton = screen.getByText('Clear')
      await user.click(clearButton)
      
      expect(nameInput).toHaveValue('')
    })
  })

  describe('Date Navigation', () => {
    it('changes date when clicking navigation buttons', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        expect(screen.getByText('Jan 1 (Mon)')).toBeInTheDocument()
      })
      
      const buttons = screen.getAllByRole('button')
      const nextButton = buttons.find(btn => 
        btn.querySelector('svg')?.getAttribute('data-testid') === 'ArrowForwardIosIcon'
      )
      
      if (nextButton) {
        await user.click(nextButton)
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/schedules/hourly?date=2024-01-02'),
            expect.any(Object)
          )
        })
      }
    })
  })

  describe('Sorting', () => {
    it('sorts employees by hour when clicking hour headers', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        expect(screen.getByText('9 AM')).toBeInTheDocument()
      })
      
      const nineAmHeader = screen.getByText('9 AM')
      await user.click(nineAmHeader)
      
      await waitFor(() => {
        expect(screen.getByText(/Sorted by 9 AM/)).toBeInTheDocument()
      })
    })

    it('clears sorting when clear filters button is clicked', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        expect(screen.getByText('9 AM')).toBeInTheDocument()
      })
      
      const nineAmHeader = screen.getByText('9 AM')
      await user.click(nineAmHeader)
      
      await waitFor(() => {
        expect(screen.getByText(/Sorted by 9 AM/)).toBeInTheDocument()
      })
      
      const clearButton = screen.getByText('Clear')
      await user.click(clearButton)
      
      await waitFor(() => {
        expect(screen.queryByText(/Sorted by/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Employee Session', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockEmployeeSession,
        status: 'authenticated',
      })
    })

    it('does not show filter controls for non-admin users', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        expect(screen.getByText('⏰ Hourly Staffing')).toBeInTheDocument()
      })
      
      expect(screen.queryByText('🔍 Filter Employees')).not.toBeInTheDocument()
    })

    it('only shows employee their own schedules', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        expect(screen.getByText('⏰ Hourly Staffing')).toBeInTheDocument()
      })
      
      expect(screen.queryByText('John Doe (Barista)')).not.toBeInTheDocument()
      expect(screen.queryByText('Jane Smith (Manager)')).not.toBeInTheDocument()
    })
  })

  describe('Legend and Help Text', () => {
    it('shows legend for staff count colors', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        expect(screen.getByText('Legend:')).toBeInTheDocument()
        expect(screen.getByText('0 staff')).toBeInTheDocument()
        expect(screen.getByText('1-2 staff')).toBeInTheDocument()
        expect(screen.getByText('3-4 staff')).toBeInTheDocument()
        expect(screen.getByText('5+ staff')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles API failure gracefully', async () => {
      setupFetchMock({
        '/api/schedules/hourly': {
          ok: false,
          status: 500,
        },
      })
      
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        expect(screen.getByText('Unable to load data.')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper table structure', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} selectedCorp="TestCorp" />)
      
      await waitFor(() => {
        const table = screen.getByRole('table')
        expect(table).toBeInTheDocument()
        
        const columnHeaders = screen.getAllByRole('columnheader')
        expect(columnHeaders.length).toBeGreaterThan(0)
      })
    })
  })
})
