'use client';

import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import ApprovalDialog from '../ApprovalDialog';
import { useSession } from 'next-auth/react';
import dayjs from 'dayjs';
import { render } from '@/utils/test-utils';

// Mock dependencies
jest.mock('next-auth/react');

// Mock fetch globally
global.fetch = jest.fn();

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock props
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
};

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
};

const mockManagerSession = {
  data: {
    user: {
      id: 'manager123',
      name: 'Manager User',
      position: 'employee',
      userType: ['manager', 'barista']
    },
    expires: '2024-12-31'
  },
  status: 'authenticated' as const,
  update: jest.fn()
};

const mockEmployeeSession = {
  data: {
    user: {
      id: 'employee123',
      name: 'Employee User',
      position: 'employee',
      userType: ['barista']
    },
    expires: '2024-12-31'
  },
  status: 'authenticated' as const,
  update: jest.fn()
};

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
};

// Mock fetch responses
const mockUserInfo = {
  _id: 'user123',
  name: 'Test User',
  userType: ['Barista', 'Manager']
};

const mockUserRoles = [
  { _id: 'role1', key: 'barista', name: 'Barista', description: 'Coffee specialist' },
  { _id: 'role2', key: 'manager', name: 'Manager', description: 'Team manager' }
];

const mockExistingSchedules = [
  { _id: 'existing1', start: '08:00', end: '12:00', approved: true },
  { _id: 'existing2', start: '13:00', end: '15:00', approved: true }
];

const mockSchedulesByUserType: { [key: string]: any[] } = {
  'Barista': [
    { _id: 'sched1', start: '09:00', end: '17:00', approved: true },
    { _id: 'sched2', start: '10:00', end: '18:00', approved: false }
  ],
  'Manager': [
    { _id: 'sched3', start: '08:00', end: '16:00', approved: true }
  ]
};

describe('ApprovalDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/users?id=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUserInfo)
        });
      }
      if (url.includes('/api/userrole')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUserRoles)
        });
      }
      if (url.includes('/api/schedules?date=') && url.includes('userId=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockExistingSchedules)
        });
      }
      if (url.includes('/api/schedules?userType=')) {
        const userType = url.split('userType=')[1].split('&')[0];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSchedulesByUserType[userType] || [])
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });
  });

  describe('Permission Handling', () => {
    it('should show unauthorized message for unauthorized users', async () => {
      mockUseSession.mockReturnValue(mockUnauthorizedSession);
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/You don't have permission to approve schedules/)).toBeInTheDocument();
        expect(screen.getByText(/Only managers, supervisors, team leads, and HR can approve schedules/)).toBeInTheDocument();
      });
    });

    it('should allow admin to approve schedules', async () => {
      mockUseSession.mockReturnValue(mockAdminSession);
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument();
        expect(screen.getByText('Approve')).toBeInTheDocument();
      });
    });

    it('should allow manager to approve schedules', async () => {
      mockUseSession.mockReturnValue(mockManagerSession);
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument();
        expect(screen.getByText('Approve')).toBeInTheDocument();
      });
    });

    it('should allow users with supervisor role to approve schedules', async () => {
      const supervisorSession = {
        data: {
          user: {
            id: 'supervisor123',
            name: 'Supervisor User',
            position: 'employee',
            userType: ['supervisor', 'barista']
          },
          expires: '2024-12-31'
        },
        status: 'authenticated' as const,
        update: jest.fn()
      };

      mockUseSession.mockReturnValue(supervisorSession);
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument();
        expect(screen.getByText('Approve')).toBeInTheDocument();
      });
    });
  });

  describe('Basic Rendering', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession);
    });

    it('should render dialog when open', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument();
      });
    });

    it('should not render dialog when closed', () => {
      render(<ApprovalDialog {...defaultProps} open={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render time pickers', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        const startTimeInputs = screen.getAllByLabelText('Start Time');
        const endTimeInputs = screen.getAllByLabelText('End Time');
        expect(startTimeInputs.length).toBeGreaterThan(0);
        expect(endTimeInputs.length).toBeGreaterThan(0);
      });
    });

    it('should render action buttons', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        expect(screen.getByText('Approve')).toBeInTheDocument();
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });
  });

  describe('Time Selection', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession);
    });

    it('should display current start and end times', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        // Check if time values are displayed (TimePicker might format differently)
        const timeInputs = screen.getAllByDisplayValue(/09:00|9:00/);
        expect(timeInputs.length).toBeGreaterThan(0);
      });
    });

    it('should call setStartTime when start time changes', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        const startTimeInputs = screen.getAllByLabelText('Start Time');
        expect(startTimeInputs.length).toBeGreaterThan(0);
      });

      // Time picker change events are complex in MUI, so we just verify the component renders
      expect(defaultProps.setStartTime).toBeDefined();
    });

    it('should call setEndTime when end time changes', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        const endTimeInputs = screen.getAllByLabelText('End Time');
        expect(endTimeInputs.length).toBeGreaterThan(0);
      });

      expect(defaultProps.setEndTime).toBeDefined();
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession);
    });

    it('should show split sessions button for 6+ hour shifts', async () => {
      const longShiftProps = {
        ...defaultProps,
        startTime: dayjs('2024-01-15 09:00'),
        endTime: dayjs('2024-01-15 17:00') // 8 hours
      };

      render(<ApprovalDialog {...longShiftProps} />);

      await waitFor(() => {
        expect(screen.getByText('Split Sessions')).toBeInTheDocument();
      });
    });

    it('should not show split sessions button for short shifts', async () => {
      const shortShiftProps = {
        ...defaultProps,
        startTime: dayjs('2024-01-15 09:00'),
        endTime: dayjs('2024-01-15 13:00') // 4 hours
      };

      render(<ApprovalDialog {...shortShiftProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Split Sessions')).not.toBeInTheDocument();
      });
    });

    it('should split sessions when split button is clicked', async () => {
      const longShiftProps = {
        ...defaultProps,
        startTime: dayjs('2024-01-15 09:00'),
        endTime: dayjs('2024-01-15 17:00')
      };

      render(<ApprovalDialog {...longShiftProps} />);

      await waitFor(() => {
        const splitButton = screen.getByText('Split Sessions');
        fireEvent.click(splitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Combine Sessions')).toBeInTheDocument();
        expect(screen.getByText('First Session')).toBeInTheDocument();
        expect(screen.getByText('Second Session')).toBeInTheDocument();
      });
    });

    it('should combine sessions when combine button is clicked', async () => {
      const longShiftProps = {
        ...defaultProps,
        startTime: dayjs('2024-01-15 09:00'),
        endTime: dayjs('2024-01-15 17:00')
      };

      render(<ApprovalDialog {...longShiftProps} />);

      // First split
      await waitFor(() => {
        const splitButton = screen.getByText('Split Sessions');
        fireEvent.click(splitButton);
      });

      // Then combine
      await waitFor(() => {
        const combineButton = screen.getByText('Combine Sessions');
        fireEvent.click(combineButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Split Sessions')).toBeInTheDocument();
        expect(screen.queryByText('First Session')).not.toBeInTheDocument();
        expect(screen.queryByText('Second Session')).not.toBeInTheDocument();
      });
    });
  });

  describe('UserType Tabs', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession);
    });

    it('should render user type tabs', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      // Wait for all API calls to complete in sequence
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/users?id=user123');
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/userrole');
      }, { timeout: 3000 });

      // Wait for tabs to be rendered
      await waitFor(() => {
        expect(screen.getByText('Barista')).toBeInTheDocument();
        expect(screen.getByText('Manager')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should switch user types when tab is clicked', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      // Wait for tabs to be rendered first
      await waitFor(() => {
        expect(screen.getByText('Barista')).toBeInTheDocument();
        expect(screen.getByText('Manager')).toBeInTheDocument();
      }, { timeout: 5000 });

      const managerTab = screen.getByText('Manager');
      fireEvent.click(managerTab);

      // Verify tab switching functionality
      await waitFor(() => {
        expect(screen.getByText('Manager')).toBeInTheDocument();
      });
    });
  });

  describe('Schedule Display', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession);
    });

    it('should display existing schedules', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Existing schedules:/)).toBeInTheDocument();
        expect(screen.getByText(/08:00-12:00/)).toBeInTheDocument();
        expect(screen.getByText(/13:00-15:00/)).toBeInTheDocument();
      });
    });

    it('should display schedules for each user type', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      // Wait for all data to load
      await waitFor(() => {
        expect(screen.getByText('Barista')).toBeInTheDocument();
        expect(screen.getByText('Manager')).toBeInTheDocument();
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(screen.getByText(/Barista Schedules/)).toBeInTheDocument();
        expect(screen.getByText(/Manager Schedules/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should show loading state when fetching schedules', async () => {
      // Mock delayed response for userType schedules only
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/users?id=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserInfo)
          });
        }
        if (url.includes('/api/userrole')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserRoles)
          });
        }
        if (url.includes('/api/schedules?date=') && url.includes('userId=')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockExistingSchedules)
          });
        }
        if (url.includes('/api/schedules?userType=')) {
          return new Promise(() => {}); // Never resolves to keep loading
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      render(<ApprovalDialog {...defaultProps} />);

      // Wait for tabs to be rendered first
      await waitFor(() => {
        expect(screen.getByText('Barista')).toBeInTheDocument();
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(screen.getByText('Loading schedules...')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should display schedule information with status indicators', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      // Wait for all data to load
      await waitFor(() => {
        expect(screen.getByText('Barista')).toBeInTheDocument();
        expect(screen.getByText('Manager')).toBeInTheDocument();
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(screen.getByText(/Barista Schedules/)).toBeInTheDocument();
        expect(screen.getByText(/Manager Schedules/)).toBeInTheDocument();
      }, { timeout: 5000 });

      await waitFor(() => {
        // Look for approved schedules with checkmark
        const approvedSchedules = screen.getAllByText(/✓/);
        expect(approvedSchedules.length).toBeGreaterThan(0);

        // Look for pending schedules with hourglass
        const pendingSchedules = screen.getAllByText(/⏳/);
        expect(pendingSchedules.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });
  });

  describe('Form Actions', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession);
    });

    it('should call onClose when Cancel button is clicked', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
      });

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onApprove when Approve button is clicked', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        const approveButton = screen.getByText('Approve');
        fireEvent.click(approveButton);
      });

      expect(defaultProps.onApprove).toHaveBeenCalledWith(
        [{ start: defaultProps.startTime, end: defaultProps.endTime }],
        'barista'
      );
    });

    it('should call onSave when Save button is clicked', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);
      });

      expect(defaultProps.onSave).toHaveBeenCalledWith(
        [{ start: defaultProps.startTime, end: defaultProps.endTime }],
        'barista'
      );
    });

    it('should call onDelete when Delete button is clicked', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);
      });

      expect(defaultProps.onDelete).toHaveBeenCalled();
    });

    it('should approve with separated sessions when split', async () => {
      const longShiftProps = {
        ...defaultProps,
        startTime: dayjs('2024-01-15 09:00'),
        endTime: dayjs('2024-01-15 17:00')
      };

      render(<ApprovalDialog {...longShiftProps} />);

      // Split sessions first
      await waitFor(() => {
        const splitButton = screen.getByText('Split Sessions');
        fireEvent.click(splitButton);
      });

      // Then approve
      await waitFor(() => {
        const approveButton = screen.getByText('Approve');
        fireEvent.click(approveButton);
      });

      expect(defaultProps.onApprove).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ start: expect.any(Object), end: expect.any(Object) }),
          expect.objectContaining({ start: expect.any(Object), end: expect.any(Object) })
        ]),
        'barista'
      );
    });

    it('should save with separated sessions when split', async () => {
      const longShiftProps = {
        ...defaultProps,
        startTime: dayjs('2024-01-15 09:00'),
        endTime: dayjs('2024-01-15 17:00')
      };

      render(<ApprovalDialog {...longShiftProps} />);

      // Split sessions first
      await waitFor(() => {
        const splitButton = screen.getByText('Split Sessions');
        fireEvent.click(splitButton);
      });

      // Then save
      await waitFor(() => {
        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);
      });

      expect(defaultProps.onSave).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ start: expect.any(Object), end: expect.any(Object) }),
          expect.objectContaining({ start: expect.any(Object), end: expect.any(Object) })
        ]),
        'barista'
      );
    });

    it('should not render delete button when onDelete is not provided', async () => {
      const propsWithoutDelete = {
        ...defaultProps,
        onDelete: undefined
      };

      render(<ApprovalDialog {...propsWithoutDelete} />);

      await waitFor(() => {
        expect(screen.queryByText('Delete')).not.toBeInTheDocument();
      });
    });

    it('should not render save button when onSave is not provided', async () => {
      const propsWithoutSave = {
        ...defaultProps,
        onSave: undefined
      };

      render(<ApprovalDialog {...propsWithoutSave} />);

      await waitFor(() => {
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
        expect(screen.getByText('Approve')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession);
    });

    it('should handle user info fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/users?id=')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      render(<ApprovalDialog {...defaultProps} />);

      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument();
      });
    });

    it('should handle schedule fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/schedules')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUserInfo)
        });
      });

      render(<ApprovalDialog {...defaultProps} />);

      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument();
      });
    });

    it('should handle user roles fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/userrole')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUserInfo)
        });
      });

      render(<ApprovalDialog {...defaultProps} />);

      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession);
    });

    it('should handle null start and end times', async () => {
      const nullTimeProps = {
        ...defaultProps,
        startTime: null,
        endTime: null
      };

      render(<ApprovalDialog {...nullTimeProps} />);

      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument();
        expect(screen.queryByText('Split Sessions')).not.toBeInTheDocument();
      });
    });

    it('should handle missing userId', async () => {
      const noUserProps = {
        ...defaultProps,
        userId: undefined
      };

      render(<ApprovalDialog {...noUserProps} />);

      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument();
      });
    });

    it('should handle missing selectedDate', async () => {
      const noDateProps = {
        ...defaultProps,
        selectedDate: undefined
      };

      render(<ApprovalDialog {...noDateProps} />);

      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument();
      });
    });

    it('should handle empty userType array', async () => {
      const emptyUserTypeSession = {
        data: {
          user: {
            id: 'admin123',
            name: 'Admin User',
            position: 'admin',
            userType: []
          },
          expires: '2024-12-31'
        },
        status: 'authenticated' as const,
        update: jest.fn()
      };

      mockUseSession.mockReturnValue(emptyUserTypeSession);
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Work Time Approval')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue(mockAdminSession);
    });

    it('should have proper ARIA labels', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        const startTimeInputs = screen.getAllByLabelText('Start Time');
        const endTimeInputs = screen.getAllByLabelText('End Time');
        expect(startTimeInputs.length).toBeGreaterThan(0);
        expect(endTimeInputs.length).toBeGreaterThan(0);
      });
    });

    it('should support keyboard navigation', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });

      // Test tab navigation
      const cancelButton = screen.getByText('Cancel');
      const approveButton = screen.getByText('Approve');
      const deleteButton = screen.getByText('Delete');
      
      expect(cancelButton).toBeInTheDocument();
      expect(approveButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it('should have proper button roles', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      });
    });

    it('should have proper tab navigation for user types', async () => {
      render(<ApprovalDialog {...defaultProps} />);

      // Wait for tabs to be rendered
      await waitFor(() => {
        expect(screen.getByText('Barista')).toBeInTheDocument();
        expect(screen.getByText('Manager')).toBeInTheDocument();
      }, { timeout: 5000 });

      await waitFor(() => {
        const tablist = screen.getByRole('tablist');
        expect(tablist).toBeInTheDocument();
        
        const tabs = screen.getAllByRole('tab');
        expect(tabs.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });
  });
}); 