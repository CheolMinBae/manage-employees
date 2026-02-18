/**
 * @jest-environment jsdom
 */
import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import AddShiftDialog from '@/app/(DashboardLayout)/components/schedule/AddShiftDialog'
import { render } from '@/utils/test-utils'

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  selectedDate: dayjs('2024-01-15'),
  userId: 'user123',
  existingShifts: [],
  fetchSchedules: jest.fn(),
}

const mockAdminSession = {
  data: {
    user: {
      id: 'admin123',
      name: 'Admin User',
      position: 'admin',
      userType: ['manager', 'barista']
    },
    expires: '2024-12-31'
  },
  status: 'authenticated' as const,
  update: jest.fn()
}

const mockEmployeeSession = {
  data: {
    user: {
      id: 'user123',
      name: 'Employee User',
      position: 'employee',
      userType: ['barista']
    },
    expires: '2024-12-31'
  },
  status: 'authenticated' as const,
  update: jest.fn()
}

const mockUnauthorizedSession = {
  data: {
    user: {
      id: 'other123',
      name: 'Other User',
      position: 'employee',
      userType: ['cashier']
    },
    expires: '2024-12-31'
  },
  status: 'authenticated' as const,
  update: jest.fn()
}

const mockTemplates = [
  { _id: 'template1', name: 'morning', displayName: 'Morning Shift', startTime: '09:00', endTime: '17:00', isActive: true, order: 1 },
  { _id: 'template2', name: 'evening', displayName: 'Evening Shift', startTime: '14:00', endTime: '22:00', isActive: true, order: 2 },
]

const mockUserRoles = [
  { _id: 'role1', key: 'barista', name: 'Barista', description: 'Coffee maker' },
  { _id: 'role2', key: 'manager', name: 'Manager', description: 'Store manager' },
]

describe('AddShiftDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
    
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/schedule-templates')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTemplates) })
      }
      if (url.includes('/api/userrole')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUserRoles) })
      }
      if (url.includes('/api/schedules')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    })
  })

  describe('Permission Handling', () => {
    it('should show unauthorized message for unauthorized users', () => {
      mockUseSession.mockReturnValue(mockUnauthorizedSession)
      render(<AddShiftDialog {...defaultProps} userId="different-user" />)
      expect(screen.getByText("You don't have permission to add schedules for this user.")).toBeInTheDocument()
    })

    it('should allow admin to add schedules for any user', async () => {
      mockUseSession.mockReturnValue(mockAdminSession)
      render(<AddShiftDialog {...defaultProps} userId="any-user" />)
      await waitFor(() => {
        expect(screen.getByText('Add Shift')).toBeInTheDocument()
      })
      expect(screen.queryByText("You don't have permission")).not.toBeInTheDocument()
    })

    it('should allow employee to add schedules for themselves', async () => {
      mockUseSession.mockReturnValue(mockEmployeeSession)
      render(<AddShiftDialog {...defaultProps} userId="user123" />)
      await waitFor(() => {
        expect(screen.getByText('Add Shift')).toBeInTheDocument()
      })
      expect(screen.queryByText("You don't have permission")).not.toBeInTheDocument()
    })
  })

  describe('Basic Rendering', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession)
    })

    it('should render dialog when open', async () => {
      render(<AddShiftDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Add Shift')).toBeInTheDocument()
      })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Save')).toBeInTheDocument()
    })

    it('should not render dialog when closed', () => {
      render(<AddShiftDialog {...defaultProps} open={false} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render UserType tabs', async () => {
      render(<AddShiftDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Barista')).toBeInTheDocument()
        expect(screen.getByText('Manager')).toBeInTheDocument()
      })
    })

    it('should render time pickers', async () => {
      render(<AddShiftDialog {...defaultProps} />)
      await waitFor(() => {
        const startTimeInputs = screen.getAllByLabelText('Start Time')
        const endTimeInputs = screen.getAllByLabelText('End Time')
        expect(startTimeInputs.length).toBeGreaterThan(0)
        expect(endTimeInputs.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Slot Management', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession)
    })

    it('should render add slot button', async () => {
      render(<AddShiftDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Add Slot')).toBeInTheDocument()
      })
    })

    it('should add new slot when Add Slot button is clicked', async () => {
      render(<AddShiftDialog {...defaultProps} />)
      await waitFor(() => {
        const addButton = screen.getByText('Add Slot')
        fireEvent.click(addButton)
      })
      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText('delete')
        expect(deleteButtons.length).toBeGreaterThan(1)
      })
    })
  })

  describe('Form Submission', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession)
      ;(global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (options?.method === 'POST' && url.includes('/api/schedules')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(url.includes('/api/userrole') ? mockUserRoles : mockTemplates) })
      })
    })

    it('should call onClose when Cancel button is clicked', async () => {
      const onClose = jest.fn()
      render(<AddShiftDialog {...defaultProps} onClose={onClose} />)
      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel')
        fireEvent.click(cancelButton)
      })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should have a clickable Save button', async () => {
      render(<AddShiftDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument()
      })
      const saveButton = screen.getByText('Save')
      expect(saveButton).toBeInTheDocument()
      expect(saveButton).not.toBeDisabled()
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession)
    })

    it('should handle missing selectedDate', async () => {
      render(<AddShiftDialog {...defaultProps} selectedDate={null} />)
      await waitFor(() => {
        expect(screen.getByText('Add Shift')).toBeInTheDocument()
      })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should handle API failures', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      render(<AddShiftDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Add Shift')).toBeInTheDocument()
      })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
