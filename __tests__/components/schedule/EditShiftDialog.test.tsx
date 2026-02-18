/**
 * @jest-environment jsdom
 */
import React from 'react'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import EditShiftDialog from '@/app/(DashboardLayout)/components/schedule/EditShiftDialog'
import { render } from '@/utils/test-utils'

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

const defaultSlot = {
  _id: 'slot123',
  date: '2024-01-15',
  start: '09:00',
  end: '17:00',
  approved: false,
  userId: 'user123',
  userType: 'barista'
}

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  slot: defaultSlot,
  fetchSchedules: jest.fn(),
}

const mockAdminSession = {
  data: {
    user: { id: 'admin123', name: 'Admin User', position: 'admin', userType: ['manager', 'barista'] },
    expires: '2024-12-31'
  },
  status: 'authenticated' as const,
  update: jest.fn()
}

const mockEmployeeSession = {
  data: {
    user: { id: 'user123', name: 'Employee User', position: 'employee', userType: ['barista'] },
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

const mockUserRoles = [
  { _id: 'role1', key: 'barista', name: 'Barista', description: 'Coffee maker' },
  { _id: 'role2', key: 'manager', name: 'Manager', description: 'Store manager' },
]

const mockExistingSchedules = [
  { _id: 'existing1', start: '08:00', end: '12:00', date: '2024-01-15', approved: true },
]

describe('EditShiftDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
    
    ;(global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/userrole')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUserRoles) })
      }
      if (url.includes('/api/schedules') && options?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
      }
      if (url.includes('/api/schedules') && options?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
      }
      if (url.includes('/api/schedules') && url.includes('date=') && url.includes('userId=')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockExistingSchedules) })
      }
      if (url.includes('/api/schedules') && url.includes('userType=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ _id: 'schedule1', start: '10:00', end: '14:00', date: '2024-01-15', approved: true }])
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    })
  })

  describe('Permission Handling', () => {
    it('should show unauthorized message for unauthorized users', () => {
      mockUseSession.mockReturnValue(mockUnauthorizedSession)
      render(<EditShiftDialog {...defaultProps} slot={{...defaultSlot, userId: 'different-user'}} />)
      expect(screen.getByText("You don't have permission to edit this schedule.")).toBeInTheDocument()
    })

    it('should allow admin to edit any schedule', async () => {
      mockUseSession.mockReturnValue(mockAdminSession)
      render(<EditShiftDialog {...defaultProps} slot={{...defaultSlot, userId: 'any-user'}} />)
      await waitFor(() => {
        expect(screen.getByText('Edit Shift')).toBeInTheDocument()
      })
      expect(screen.queryByText("You don't have permission")).not.toBeInTheDocument()
    })

    it('should allow employee to edit their own schedule', async () => {
      mockUseSession.mockReturnValue(mockEmployeeSession)
      render(<EditShiftDialog {...defaultProps} slot={{...defaultSlot, userId: 'user123'}} />)
      await waitFor(() => {
        expect(screen.getByText('Edit Shift')).toBeInTheDocument()
      })
    })
  })

  describe('Basic Rendering', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession)
    })

    it('should render dialog when open', async () => {
      render(<EditShiftDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Edit Shift')).toBeInTheDocument()
      })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Save')).toBeInTheDocument()
    })

    it('should not render dialog when closed', () => {
      render(<EditShiftDialog {...defaultProps} open={false} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should show editing info message', async () => {
      render(<EditShiftDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Editing schedule for 2024-01-15')).toBeInTheDocument()
      })
    })
  })

  describe('Time Editing', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession)
    })

    it('should render time pickers with current values', async () => {
      render(<EditShiftDialog {...defaultProps} />)
      await waitFor(() => {
        const startTimeInputs = screen.getAllByLabelText('Start Time')
        const endTimeInputs = screen.getAllByLabelText('End Time')
        expect(startTimeInputs.length).toBeGreaterThan(0)
        expect(endTimeInputs.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Form Actions', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession)
      Object.defineProperty(window, 'confirm', { writable: true, value: jest.fn(() => true) })
    })

    it('should call onClose when Cancel button is clicked', async () => {
      const onClose = jest.fn()
      render(<EditShiftDialog {...defaultProps} onClose={onClose} />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('Cancel'))
      })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should have Save button available for editing', async () => {
      render(<EditShiftDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument()
      })
      const saveButton = screen.getByText('Save')
      expect(saveButton).not.toBeDisabled()
    })

    it('should delete current schedule when Delete button is clicked', async () => {
      render(<EditShiftDialog {...defaultProps} />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('Delete'))
      })
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/schedules?id=slot123'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })

    it('should make day OFF when Make OFF button is clicked', async () => {
      render(<EditShiftDialog {...defaultProps} />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('Make OFF'))
      })
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/schedules?userId=user123&date=2024-01-15&deleteAll=true'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })

    it('should show Reset to Pending button for approved schedules', async () => {
      const approvedSlot = { ...defaultSlot, approved: true }
      render(<EditShiftDialog {...defaultProps} slot={approvedSlot} />)
      await waitFor(() => {
        expect(screen.getByText('Reset to Pending')).toBeInTheDocument()
      })
    })

    it('should show Approve button for admin on pending schedules', async () => {
      const pendingSlot = { ...defaultSlot, approved: false }
      render(<EditShiftDialog {...defaultProps} slot={pendingSlot} />)
      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument()
      })
    })

    it('should not show Approve button for non-admin users', async () => {
      mockUseSession.mockReturnValue(mockEmployeeSession)
      const pendingSlot = { ...defaultSlot, approved: false }
      render(<EditShiftDialog {...defaultProps} slot={pendingSlot} />)
      await waitFor(() => {
        expect(screen.queryByText('Approve')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession)
    })

    it('should handle null slot prop', async () => {
      render(<EditShiftDialog {...defaultProps} slot={null} />)
      await waitFor(() => {
        expect(screen.getByText('Edit Shift')).toBeInTheDocument()
      })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      render(<EditShiftDialog {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Edit Shift')).toBeInTheDocument()
      })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
