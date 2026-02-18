/**
 * @jest-environment jsdom
 */
import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from 'next-auth/react'
import WeeklyScheduleTable from '@/app/(DashboardLayout)/components/dashboard/WeeklyScheduleTable'
import { render, setupFetchMock, mockWeeklyScheduleData, mockSession, mockEmployeeSession, clearAllMocks } from '@/utils/test-utils'

// Mock the child components
jest.mock('@/app/(DashboardLayout)/components/approve/ApprovalDialog', () => {
  return function MockApprovalDialog({ open, onClose }: any) {
    return open ? <div data-testid="approval-dialog">Approval Dialog</div> : null
  }
})

jest.mock('@/app/(DashboardLayout)/components/schedule/EditShiftDialog', () => {
  return function MockEditShiftDialog({ open, onClose }: any) {
    return open ? <div data-testid="edit-shift-dialog">Edit Shift Dialog</div> : null
  }
})

jest.mock('@/app/(DashboardLayout)/components/schedule/AddShiftDialog', () => {
  return function MockAddShiftDialog({ open, onClose }: any) {
    return open ? <div data-testid="add-shift-dialog">Add Shift Dialog</div> : null
  }
})

jest.mock('@/app/(DashboardLayout)/components/schedule/SimpleAddShiftDialog', () => {
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
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
    })

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
      
      const headers = screen.getAllByRole('columnheader')
      expect(headers.length).toBeGreaterThan(2)
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
      
      expect(screen.getAllByText('Filter by')[0]).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
      expect(screen.getByText('Clear')).toBeInTheDocument()
    })

    it('allows filtering by name', async () => {
      const user = userEvent.setup()
      render(<WeeklyScheduleTable {...mockProps} />)
      
      const nameAutocomplete = screen.getByLabelText('Select Names')
      await user.click(nameAutocomplete)
      
      await waitFor(() => {
        const johnDoeOptions = screen.getAllByText('John Doe')
        expect(johnDoeOptions.length).toBeGreaterThan(0)
      })
    })

    it('shows publish button when all schedules are approved', () => {
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

    it('renders excel download button', () => {
      render(<WeeklyScheduleTable {...mockProps} />)
      
      const downloadButton = screen.getByText('Excel')
      expect(downloadButton).toBeInTheDocument()
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

    it('hides other employees data for non-admin users', () => {
      render(<WeeklyScheduleTable {...mockProps} />)
      
      // Employee 'Test Employee'는 mock schedule data에 없으므로
      // 본인 이름만 나와야 하며, 다른 직원은 안 보여야 함
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
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
      
      const pendingSlot = screen.getByText('10:00–18:00')
      await user.click(pendingSlot)
      
      await waitFor(() => {
        expect(screen.getByTestId('approval-dialog')).toBeInTheDocument()
      })
    })

    it('opens edit dialog when clicking approved schedule', async () => {
      const user = userEvent.setup()
      render(<WeeklyScheduleTable {...mockProps} />)
      
      const approvedSlot = screen.getByText('09:00–17:00')
      await user.click(approvedSlot)
      
      await waitFor(() => {
        expect(screen.getByTestId('edit-shift-dialog')).toBeInTheDocument()
      })
    })

    it('opens simple add dialog when clicking OFF', async () => {
      const user = userEvent.setup()
      render(<WeeklyScheduleTable {...mockProps} />)
      
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

  describe('Accessibility', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })
    })

    it('has proper table structure with headers', () => {
      render(<WeeklyScheduleTable {...mockProps} />)
      
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      
      const columnHeaders = screen.getAllByRole('columnheader')
      expect(columnHeaders.length).toBeGreaterThan(0)
      
      expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /position/i })).toBeInTheDocument()
    })

    it('displays weekly total hours for each employee', () => {
      render(<WeeklyScheduleTable {...mockProps} />)
      
      expect(screen.getByText('Weekly Total')).toBeInTheDocument()
      
      const weeklyTotals = screen.getAllByText(/\d+h/)
      expect(weeklyTotals.length).toBeGreaterThan(0)
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
              { _id: 'slot1', start: '10:00', end: '11:00', status: 'approved' as const },
              { _id: 'slot2', start: '14:00', end: '16:00', status: 'pending' as const },
            ]
          },
          {
            date: '2024-01-02', 
            slots: [
              { _id: 'slot3', start: '10:00', end: '12:00', status: 'approved' as const },
            ]
          }
        ]
      }
      
      render(<WeeklyScheduleTable {...mockProps} scheduleData={[testUser]} />)
      
      expect(screen.getByText('3h')).toBeInTheDocument()
    })
  })
})
