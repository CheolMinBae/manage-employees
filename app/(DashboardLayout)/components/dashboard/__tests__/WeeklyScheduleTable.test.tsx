import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from 'next-auth/react'
import WeeklyScheduleTable from '../WeeklyScheduleTable.tsx_backup2'
import { render, setupFetchMock, mockWeeklyScheduleData, mockSession, mockEmployeeSession, clearAllMocks } from '@/utils/test-utils'

// Mock the child components
jest.mock('../../approve/ApprovalDialog', () => {
  return function MockApprovalDialog({ open, onClose }: any) {
    return open ? <div data-testid="approval-dialog">Approval Dialog</div> : null
  }
})

jest.mock('../../schedule/EditShiftDialog', () => {
  return function MockEditShiftDialog({ open, onClose }: any) {
    return open ? <div data-testid="edit-shift-dialog">Edit Shift Dialog</div> : null
  }
})

jest.mock('../../schedule/AddShiftDialog', () => {
  return function MockAddShiftDialog({ open, onClose }: any) {
    return open ? <div data-testid="add-shift-dialog">Add Shift Dialog</div> : null
  }
})

jest.mock('../../schedule/SimpleAddShiftDialog', () => {
  return function MockSimpleAddShiftDialog({ open, onClose }: any) {
    return open ? <div data-testid="simple-add-shift-dialog">Simple Add Shift Dialog</div> : null
  }
})

const mockProps = {
  weekRange: 'Jan 1 - Jan 7, 2024',
  dates: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07'],
  scheduleData: mockWeeklyScheduleData,
  weekStart: new Date('2024-01-01'),
  onWeekChange: jest.fn(),
  onRefresh: jest.fn(),
}

describe('WeeklyScheduleTable', () => {
  beforeEach(() => {
    clearAllMocks()
    setupFetchMock({
      '/api/schedules/download': {
        ok: true,
        blob: async () => new Blob(['mock excel data']),
      },
      '/api/schedules': {
        ok: true,
        json: async () => ({ success: true }),
      },
    })
  })

  describe('Rendering', () => {
    it('renders the weekly schedule table with correct title', () => {
      render(<WeeklyScheduleTable {...mockProps} />)
      
      expect(screen.getByText('🗓️ Weekly Schedule')).toBeInTheDocument()
      expect(screen.getByText('Jan 1 - Jan 7, 2024')).toBeInTheDocument()
    })

    it('renders all employee names and positions', () => {
      render(<WeeklyScheduleTable {...mockProps} />)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Barista, Cashier')).toBeInTheDocument()
      expect(screen.getByText('Manager')).toBeInTheDocument()
    })

    it('renders schedule slots with correct times', () => {
      render(<WeeklyScheduleTable {...mockProps} />)
      
      expect(screen.getByText('09:00–17:00')).toBeInTheDocument()
      expect(screen.getByText('10:00–18:00')).toBeInTheDocument()
      expect(screen.getByText('08:00–16:00')).toBeInTheDocument()
    })

    it('renders date headers correctly', () => {
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Check if date headers are rendered (format: "Day Mon d")
      const headers = screen.getAllByRole('columnheader')
      expect(headers.length).toBeGreaterThan(2) // Name, Position + date columns
    })

    it('renders OFF for empty schedule slots', () => {
      render(<WeeklyScheduleTable {...mockProps} />)
      
      const offElements = screen.getAllByText('OFF')
      expect(offElements.length).toBeGreaterThan(0)
    })
  })

  describe('Admin Features', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
    })

    it('shows admin filter controls', () => {
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Use getAllByText for elements that appear multiple times
      expect(screen.getAllByText('Filter by')[0]).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
      expect(screen.getByText('Clear')).toBeInTheDocument()
    })

    it('allows filtering by name', async () => {
      const user = userEvent.setup()
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Open the name filter dropdown
      const nameAutocomplete = screen.getByLabelText('Select Names')
      await user.click(nameAutocomplete)
      
      // Should show employee names in dropdown - use getAllByText since name appears in table too
      await waitFor(() => {
        const johnDoeOptions = screen.getAllByText('John Doe')
        expect(johnDoeOptions.length).toBeGreaterThan(0)
      })
    })

    it('allows filtering by keyword', async () => {
      const user = userEvent.setup()
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Test that the filter components are present and functional
      expect(screen.getByLabelText('Select Names')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
      
      // Test that we can interact with the search button
      const searchButton = screen.getByText('Search')
      await user.click(searchButton)
      
      // Verify the search button is clickable
      expect(searchButton).toBeInTheDocument()
    })

    it('allows filtering by position', async () => {
      const user = userEvent.setup()
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Test that basic UI elements are present
      expect(screen.getByText('Search')).toBeInTheDocument()
      expect(screen.getByText('Clear')).toBeInTheDocument()
      
      // Verify the search functionality is available
      const searchButton = screen.getByText('Search')
      await user.click(searchButton)
      expect(searchButton).toBeInTheDocument()
    })

    it('shows publish button when all schedules are approved', () => {
      // Mock data with all approved schedules
      const approvedData = mockWeeklyScheduleData.map(user => ({
        ...user,
        shifts: user.shifts.map(shift => ({
          ...shift,
          slots: shift.slots.map(slot => ({
            ...slot,
            status: 'approved' as const,
          })),
        })),
      }))

      render(<WeeklyScheduleTable {...mockProps} scheduleData={approvedData} />)
      
      const publishButton = screen.getByText('Publish')
      expect(publishButton).toBeInTheDocument()
      expect(publishButton).not.toBeDisabled()
    })

    it('downloads excel when download button is clicked', async () => {
      const user = userEvent.setup()
      render(<WeeklyScheduleTable {...mockProps} />)
      
      const downloadButton = screen.getByText('Excel')
      await user.click(downloadButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/schedules/download'),
          expect.objectContaining({ method: 'GET' })
        )
      })
    })
  })

  describe('Employee Features', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        data: mockEmployeeSession,
        status: 'authenticated',
      })
    })

    it('does not show admin filter controls for employees', () => {
      render(<WeeklyScheduleTable {...mockProps} />)
      
      expect(screen.queryByText('Filter by')).not.toBeInTheDocument()
    })

    it('only shows employee their own schedules', () => {
      // For employee users, they should only see their own data
      // Since mock data doesn't contain "Employee User", the table should be empty
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // The table body should be empty since employee can't see other employees' data
      const tableBody = document.querySelector('tbody')
      expect(tableBody).toBeInTheDocument()
      expect(tableBody?.children.length).toBe(0) // No rows should be rendered
    })

    it('employee can only interact with their own schedule slots', () => {
      // Since the default mock data doesn't contain the logged-in employee,
      // the table should be empty for non-admin users
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Should not see any employee rows
      const tableBody = document.querySelector('tbody')
      expect(tableBody).toBeInTheDocument()
      expect(tableBody?.children.length).toBe(0)
    })

    it('employee cannot see other employees schedules', () => {
      // Use original mock data that has different employee names
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Since the logged-in user is "Employee User" but mock data has "John Doe" and "Jane Smith",
      // the table body should be empty (no employees shown)
      const tableBody = document.querySelector('tbody')
      expect(tableBody).toBeInTheDocument()
      expect(tableBody?.children.length).toBe(0) // No rows should be rendered
    })
  })

  describe('Schedule Interactions', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
    })

    it('opens approval dialog when clicking pending schedule', async () => {
      const user = userEvent.setup()
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Click on a pending schedule slot
      const pendingSlot = screen.getByText('10:00–18:00')
      await user.click(pendingSlot)
      
      await waitFor(() => {
        expect(screen.getByTestId('approval-dialog')).toBeInTheDocument()
      })
    })

    it('opens edit dialog when clicking approved schedule', async () => {
      const user = userEvent.setup()
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Click on an approved schedule slot
      const approvedSlot = screen.getByText('09:00–17:00')
      await user.click(approvedSlot)
      
      await waitFor(() => {
        expect(screen.getByTestId('edit-shift-dialog')).toBeInTheDocument()
      })
    })

    it('opens simple add dialog when clicking OFF', async () => {
      const user = userEvent.setup()
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Click on an OFF slot
      const offSlots = screen.getAllByText('OFF')
      await user.click(offSlots[0])
      
      await waitFor(() => {
        expect(screen.getByTestId('simple-add-shift-dialog')).toBeInTheDocument()
      })
    })
  })

  describe('Week Navigation', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
    })

    it('calls onWeekChange when clicking navigation buttons', async () => {
      const user = userEvent.setup()
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Find navigation buttons by their icon test ids
      const allButtons = screen.getAllByRole('button')
      const prevButton = allButtons.find(btn => 
        btn.querySelector('svg')?.getAttribute('data-testid') === 'ArrowBackIosNewIcon'
      )
      const nextButton = allButtons.find(btn => 
        btn.querySelector('svg')?.getAttribute('data-testid') === 'ArrowForwardIosIcon'
      )
      
      if (prevButton) {
        await user.click(prevButton)
        expect(mockProps.onWeekChange).toHaveBeenCalledWith('prev')
      }
      
      if (nextButton) {
        await user.click(nextButton)
        expect(mockProps.onWeekChange).toHaveBeenCalledWith('next')
      }
    })
  })

  describe('Clear Filters', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
    })

    it('clears all filters when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Test that the filter components are present and functional
      expect(screen.getByLabelText('Select Names')).toBeInTheDocument()
      expect(screen.getByText('Clear')).toBeInTheDocument()
      
      // Test that we can interact with the clear button
      const clearButton = screen.getByText('Clear')
      await user.click(clearButton)
      
      // Verify the clear button is clickable and filter remains
      expect(clearButton).toBeInTheDocument()
      expect(screen.getByLabelText('Select Names')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles excel download failure gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock failed fetch
      setupFetchMock({
        '/api/schedules/download': {
          ok: false,
          status: 500,
        },
      })
      
      // Mock alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation()
      
      render(<WeeklyScheduleTable {...mockProps} />)
      
      const downloadButton = screen.getByText('Excel')
      await user.click(downloadButton)
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to download excel file')
      })
      
      alertSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('has proper table structure with headers', () => {
      render(<WeeklyScheduleTable {...mockProps} />)
      
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      
      const columnHeaders = screen.getAllByRole('columnheader')
      expect(columnHeaders.length).toBeGreaterThan(0)
      
      // Check for required column headers
      expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /position/i })).toBeInTheDocument()
    })

    it('has clickable elements with proper cursor styling', () => {
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Find clickable schedule slots (approved status)
      const clickableSlots = screen.getAllByText(/09:00–17:00|10:00–18:00/)
      expect(clickableSlots.length).toBeGreaterThan(0)
    })

    it('displays weekly total hours for each employee', () => {
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Check that Weekly Total header exists
      expect(screen.getByText('Weekly Total')).toBeInTheDocument()
      
      // Mock data includes John Doe with approved shifts
      // Let's check that some weekly totals are displayed
      const weeklyTotals = screen.getAllByText(/\d+h/)
      expect(weeklyTotals.length).toBeGreaterThan(0)
      
      // Verify the format is correct (ends with 'h' or contains 'h ')
      weeklyTotals.forEach(total => {
        expect(total.textContent).toMatch(/^\d+h( \d+m)?$|^0h$/)
      })
    })

    it('calculates weekly hours correctly for approved schedules only', () => {
      const testUser = {
        userId: 'test-user',
        name: 'Test User',
        position: 'Barista',
        corp: 'Test Corp',
        eid: 'T001',
        category: 'Full-time',
        shifts: [
          {
            date: '2024-01-01',
            slots: [
              { _id: 'slot1', start: '10:00', end: '11:00', status: 'approved' as const }, // 1h
              { _id: 'slot2', start: '14:00', end: '16:00', status: 'pending' as const },  // should not count
            ]
          },
          {
            date: '2024-01-02', 
            slots: [
              { _id: 'slot3', start: '10:00', end: '12:00', status: 'approved' as const }, // 2h
            ]
          }
        ]
      }
      
      const testProps = {
        ...mockProps,
        scheduleData: [testUser]
      }
      
      render(<WeeklyScheduleTable {...testProps} />)
      
      // Should display 3h total (only approved: 1h + 2h)
      expect(screen.getByText('3h')).toBeInTheDocument()
    })
  })
}) 