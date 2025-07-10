import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmployeeManagement from '../EmployeeManagement'
import { render, setupFetchMock, clearAllMocks } from '@/utils/test-utils'

// Mock data
const mockEmployees = [
  {
    _id: 'emp1',
    name: 'John Doe',
    email: 'john@example.com',
    position: 'employee',
    userType: ['barista', 'cashier'],
    corp: 'Main Store',
    eid: 'E001',
    category: 'Full-time',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    _id: 'emp2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    position: 'admin',
    userType: ['manager'],
    corp: 'Branch Store',
    eid: 'E002',
    category: 'Part-time',
    createdAt: '2024-01-02T00:00:00Z'
  }
]

const mockCorporations = [
  { _id: 'corp1', name: 'Main Store', description: 'Main location' },
  { _id: 'corp2', name: 'Branch Store', description: 'Branch location' }
]

const mockUserRoles = [
  { _id: 'role1', key: 'BARISTA', name: 'Barista', description: 'Coffee maker' },
  { _id: 'role2', key: 'CASHIER', name: 'Cashier', description: 'Handle payments' },
  { _id: 'role3', key: 'MANAGER', name: 'Manager', description: 'Store manager' }
]

// Mock window.confirm and window.alert
const mockConfirm = jest.fn()
const mockAlert = jest.fn()

Object.defineProperty(window, 'confirm', {
  writable: true,
  value: mockConfirm
})

Object.defineProperty(window, 'alert', {
  writable: true,
  value: mockAlert
})

// Helper function to setup default mocks
const setupDefaultMocks = () => {
  setupFetchMock({
    '/api/users': {
      ok: true,
      json: async () => mockEmployees
    },
    '/api/corporation': {
      ok: true,
      json: async () => mockCorporations
    },
    '/api/userrole': {
      ok: true,
      json: async () => mockUserRoles
    }
  })
}

describe('EmployeeManagement', () => {
  beforeEach(() => {
    clearAllMocks()
    mockConfirm.mockClear()
    mockAlert.mockClear()
    setupDefaultMocks()
  })

  describe('Basic Rendering', () => {
    it('renders the main title', () => {
      render(<EmployeeManagement />)
      
      expect(screen.getByText('👥 Employee Management')).toBeInTheDocument()
    })

    it('renders the add employee button', () => {
      render(<EmployeeManagement />)
      
      expect(screen.getByRole('button', { name: 'Add Employee' })).toBeInTheDocument()
    })

    it('renders search section', () => {
      render(<EmployeeManagement />)
      
      expect(screen.getByText('Search Employees')).toBeInTheDocument()
    })

    it('renders employee table after data loads', async () => {
      render(<EmployeeManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('shows employee count after data loads', async () => {
      render(<EmployeeManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('2 / 2 employees')).toBeInTheDocument()
      }, { timeout: 5000 })
    })
  })

  describe('Employee Data Display', () => {
    it('displays employee details correctly', async () => {
      render(<EmployeeManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      }, { timeout: 5000 })
      
      // Check employee information
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
      expect(screen.getByText('E001')).toBeInTheDocument()
      expect(screen.getByText('E002')).toBeInTheDocument()
      expect(screen.getByText('Full-time')).toBeInTheDocument()
      expect(screen.getByText('Part-time')).toBeInTheDocument()
    })

    it('handles empty employee list', async () => {
      setupFetchMock({
        '/api/users': {
          ok: true,
          json: async () => []
        },
        '/api/corporation': {
          ok: true,
          json: async () => mockCorporations
        },
        '/api/userrole': {
          ok: true,
          json: async () => mockUserRoles
        }
      })

      render(<EmployeeManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('No employees found.')).toBeInTheDocument()
        expect(screen.getByText('0 / 0 employees')).toBeInTheDocument()
      }, { timeout: 5000 })
    })
  })

  describe('Search Functionality', () => {
    it('filters employees by name search', async () => {
      const user = userEvent.setup()
      render(<EmployeeManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Search by name
      const searchInput = screen.getByLabelText('Search by Name')
      await user.type(searchInput, 'John')
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
        expect(screen.getByText('1 / 2 employees')).toBeInTheDocument()
      })
    })

    it('clears search filters', async () => {
      const user = userEvent.setup()
      render(<EmployeeManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Apply search
      const searchInput = screen.getByLabelText('Search by Name')
      await user.type(searchInput, 'John')
      
      await waitFor(() => {
        expect(screen.getByText('1 / 2 employees')).toBeInTheDocument()
      })

      // Clear search
      const clearButton = screen.getByText('Clear')
      await user.click(clearButton)
      
      await waitFor(() => {
        expect(screen.getByText('2 / 2 employees')).toBeInTheDocument()
      })
    })
  })

  describe('Dialog Operations', () => {
    it('opens add employee dialog', async () => {
      const user = userEvent.setup()
      render(<EmployeeManagement />)
      
      const addButton = screen.getByRole('button', { name: 'Add Employee' })
      await user.click(addButton)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByLabelText('Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Email')).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
      })
    })

    it('opens edit dialog when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<EmployeeManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Click edit button for first employee
      const editButtons = screen.getAllByTestId('EditIcon')
      await user.click(editButtons[0])
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
        expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
      })
    })

    it('shows reset password button in edit dialog', async () => {
      const user = userEvent.setup()
      render(<EmployeeManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Open edit dialog
      const editButtons = screen.getAllByTestId('EditIcon')
      await user.click(editButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText('Reset Password')).toBeInTheDocument()
      })
    })
  })

  describe('Delete Functionality', () => {
    it('shows confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup()
      mockConfirm.mockReturnValue(false) // User cancels
      
      render(<EmployeeManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Click delete button
      const deleteButtons = screen.getAllByTestId('DeleteIcon')
      await user.click(deleteButtons[0])
      
      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this employee? This will also delete all their schedules.'
      )
    })
  })

  describe('Error Handling', () => {
    it('handles API fetch errors gracefully', () => {
      setupFetchMock({
        '/api/users': {
          ok: false,
          status: 500
        },
        '/api/corporation': {
          ok: true,
          json: async () => mockCorporations
        },
        '/api/userrole': {
          ok: true,
          json: async () => mockUserRoles
        }
      })

      // Should not crash even with API errors
      render(<EmployeeManagement />)
      
      expect(screen.getByText('👥 Employee Management')).toBeInTheDocument()
    })
  })

  describe('Table Structure', () => {
    it('has proper table headers', async () => {
      render(<EmployeeManagement />)
      
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      
      // Check for table headers using role
      const columnHeaders = screen.getAllByRole('columnheader')
      expect(columnHeaders).toHaveLength(8)
      
      // Check specific headers exist without conflicting with search elements
      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Position' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'User Type' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Corporation' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'EID' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument()
    })

    it('shows edit and delete buttons for each employee', async () => {
      render(<EmployeeManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      }, { timeout: 5000 })
      
      // Should have edit and delete buttons
      const editButtons = screen.getAllByTestId('EditIcon')
      const deleteButtons = screen.getAllByTestId('DeleteIcon')
      
      // Should have 2 employees, so 2 edit and 2 delete buttons
      expect(editButtons).toHaveLength(2)
      expect(deleteButtons).toHaveLength(2)
    })
  })

  describe('Form Labels', () => {
    it('has proper form accessibility', async () => {
      const user = userEvent.setup()
      render(<EmployeeManagement />)
      
      const addButton = screen.getByRole('button', { name: 'Add Employee' })
      await user.click(addButton)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Email')).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
        expect(screen.getByLabelText('User Type')).toBeInTheDocument()
        expect(screen.getByLabelText('Corporation')).toBeInTheDocument()
        expect(screen.getByLabelText('EID')).toBeInTheDocument()
        expect(screen.getByLabelText('Category')).toBeInTheDocument()
      })
    })
  })
}) 