/**
 * @jest-environment jsdom
 */
import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import ApprovalDialog from '@/app/(DashboardLayout)/components/approve/ApprovalDialog'
import { render } from '@/utils/test-utils'

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  startTime: dayjs('2024-01-15 09:00'),
  endTime: dayjs('2024-01-15 17:00'),
  setStartTime: jest.fn(),
  setEndTime: jest.fn(),
  onApprove: jest.fn(),
  onSave: jest.fn(),
  onDelete: jest.fn(),
  selectedDate: '2024-01-15',
  userId: 'user123',
  currentScheduleId: 'schedule123',
  currentUserType: 'barista'
}

const mockAdminSession = {
  data: {
    user: { id: 'admin123', name: 'Admin User', position: 'admin', userType: ['manager', 'barista'] },
    expires: '2024-12-31'
  },
  status: 'authenticated' as const,
  update: jest.fn()
}

const mockManagerSession = {
  data: {
    user: { id: 'manager123', name: 'Manager User', position: 'employee', userType: ['manager', 'barista'] },
    expires: '2024-12-31'
  },
  status: 'authenticated' as const,
  update: jest.fn()
}

const mockUnauthorizedSession = {
  data: {
    user: { id: 'other123', name: 'Other User', position: 'employee', userType: ['cashier'] },
    expires: '2024-12-31'
  },
  status: 'authenticated' as const,
  update: jest.fn()
}

const mockUserInfo = { _id: 'user123', name: 'Test User', userType: ['Barista', 'Manager'] }
const mockUserRoles = [
  { _id: 'role1', key: 'barista', name: 'Barista', description: 'Coffee specialist' },
  { _id: 'role2', key: 'manager', name: 'Manager', description: 'Team manager' },
]
const mockExistingSchedules = [
  { _id: 'existing1', start: '08:00', end: '12:00', approved: true },
  { _id: 'existing2', start: '13:00', end: '15:00', approved: true },
]
const mockSchedulesByUserType: { [key: string]: any[] } = {
  'Barista': [
    { _id: 'sched1', start: '09:00', end: '17:00', approved: true },
    { _id: 'sched2', start: '10:00', end: '18:00', approved: false },
  ],
  'Manager': [
    { _id: 'sched3', start: '08:00', end: '16:00', approved: true },
  ]
}

describe('ApprovalDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/users?id=')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUserInfo) })
      }
      if (url.includes('/api/userrole')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUserRoles) })
      }
      if (url.includes('/api/schedules?date=') && url.includes('userId=')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockExistingSchedules) })
      }
      if (url.includes('/api/schedules?userType=')) {
        const userType = url.split('userType=')[1].split('&')[0]
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSchedulesByUserType[userType] || []) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    })
  })

  describe('Permission Handling', () => {
    it('should show unauthorized message for unauthorized users', async () => {
      mockUseSession.mockReturnValue(mockUnauthorizedSession)
      render(<ApprovalDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText(/You don't have permission to approve schedules/)).toBeInTheDocument()
      })
    })

    it('should allow admin to approve schedules', async () => {
      mockUseSession.mockReturnValue(mockAdminSession)
      render(<ApprovalDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument()
        expect(screen.getByText('Approve')).toBeInTheDocument()
      })
    })

    it('should allow manager to approve schedules', async () => {
      mockUseSession.mockReturnValue(mockManagerSession)
      render(<ApprovalDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument()
        expect(screen.getByText('Approve')).toBeInTheDocument()
      })
    })
  })

  describe('Basic Rendering', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession)
    })

    it('should render dialog when open', async () => {
      render(<ApprovalDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument()
      })
    })

    it('should not render dialog when closed', () => {
      render(<ApprovalDialog {...defaultProps} open={false} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render time pickers', async () => {
      render(<ApprovalDialog {...defaultProps} />)
      await waitFor(() => {
        const startTimeInputs = screen.getAllByLabelText('Start Time')
        const endTimeInputs = screen.getAllByLabelText('End Time')
        expect(startTimeInputs.length).toBeGreaterThan(0)
        expect(endTimeInputs.length).toBeGreaterThan(0)
      })
    })

    it('should render action buttons', async () => {
      render(<ApprovalDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument()
        expect(screen.getByText('Approve')).toBeInTheDocument()
        expect(screen.getByText('Save')).toBeInTheDocument()
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })
    })
  })

  describe('Session Management', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession)
    })

    it('should show split sessions button for 6+ hour shifts', async () => {
      render(<ApprovalDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Split Sessions')).toBeInTheDocument()
      })
    })

    it('should not show split sessions button for short shifts', async () => {
      const shortShiftProps = {
        ...defaultProps,
        startTime: dayjs('2024-01-15 09:00'),
        endTime: dayjs('2024-01-15 13:00'),
      }
      render(<ApprovalDialog {...shortShiftProps} />)
      await waitFor(() => {
        expect(screen.queryByText('Split Sessions')).not.toBeInTheDocument()
      })
    })

    it('should split and combine sessions', async () => {
      render(<ApprovalDialog {...defaultProps} />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Split Sessions'))
      })
      await waitFor(() => {
        expect(screen.getByText('Combine Sessions')).toBeInTheDocument()
        expect(screen.getByText('First Session')).toBeInTheDocument()
        expect(screen.getByText('Second Session')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Combine Sessions'))
      await waitFor(() => {
        expect(screen.getByText('Split Sessions')).toBeInTheDocument()
        expect(screen.queryByText('First Session')).not.toBeInTheDocument()
      })
    })
  })

  describe('Schedule Display', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession)
    })

    it('should display existing schedules', async () => {
      render(<ApprovalDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText(/Existing schedules:/)).toBeInTheDocument()
        expect(screen.getByText(/08:00-12:00/)).toBeInTheDocument()
        expect(screen.getByText(/13:00-15:00/)).toBeInTheDocument()
      })
    })
  })

  describe('Form Actions', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession)
    })

    it('should call onClose when Cancel button is clicked', async () => {
      render(<ApprovalDialog {...defaultProps} />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('Cancel'))
      })
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('should call onApprove when Approve button is clicked', async () => {
      render(<ApprovalDialog {...defaultProps} />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('Approve'))
      })
      expect(defaultProps.onApprove).toHaveBeenCalledWith(
        [{ start: defaultProps.startTime, end: defaultProps.endTime }],
        'barista'
      )
    })

    it('should call onSave when Save button is clicked', async () => {
      render(<ApprovalDialog {...defaultProps} />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('Save'))
      })
      expect(defaultProps.onSave).toHaveBeenCalledWith(
        [{ start: defaultProps.startTime, end: defaultProps.endTime }],
        'barista'
      )
    })

    it('should call onDelete when Delete button is clicked', async () => {
      render(<ApprovalDialog {...defaultProps} />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('Delete'))
      })
      expect(defaultProps.onDelete).toHaveBeenCalled()
    })

    it('should not render delete button when onDelete is not provided', async () => {
      render(<ApprovalDialog {...{...defaultProps, onDelete: undefined}} />)
      await waitFor(() => {
        expect(screen.queryByText('Delete')).not.toBeInTheDocument()
      })
    })

    it('should not render save button when onSave is not provided', async () => {
      render(<ApprovalDialog {...{...defaultProps, onSave: undefined}} />)
      await waitFor(() => {
        expect(screen.queryByText('Save')).not.toBeInTheDocument()
        expect(screen.getByText('Approve')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession)
    })

    it('should handle user info fetch errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/users?id=')) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      })
      render(<ApprovalDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession)
    })

    it('should handle null start and end times', async () => {
      render(<ApprovalDialog {...{...defaultProps, startTime: null, endTime: null}} />)
      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument()
        expect(screen.queryByText('Split Sessions')).not.toBeInTheDocument()
      })
    })

    it('should handle missing userId', async () => {
      render(<ApprovalDialog {...{...defaultProps, userId: undefined}} />)
      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument()
      })
    })
  })
})
