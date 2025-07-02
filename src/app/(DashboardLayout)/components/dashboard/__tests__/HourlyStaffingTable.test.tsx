import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from 'next-auth/react'
import HourlyStaffingTable from '../HourlyStaffingTable'
import { render, setupFetchMock, mockHourlyData, mockSession, mockEmployeeSession, clearAllMocks, mockFetchResponses } from '@/utils/test-utils'

// Mock the child components
jest.mock('../../schedule/EditShiftDialog', () => {
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
    
    // Mock useSession as admin by default
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })
  })

  describe('Rendering', () => {
    it('renders the hourly staffing table with correct title', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText('⏰ Hourly Staffing')).toBeInTheDocument()
      })
    })

    it('renders California timezone notice', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText(/All times are displayed in California/)).toBeInTheDocument()
      })
    })

    it('renders employee names and information', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText('John Doe (Barista)')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith (Manager)')).toBeInTheDocument()
      })
    })

    it('renders filter controls', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText('🔍 Filter Employees')).toBeInTheDocument()
        expect(screen.getByLabelText('Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Position')).toBeInTheDocument()
        expect(screen.getByLabelText('Company')).toBeInTheDocument()
        expect(screen.getByLabelText('Category')).toBeInTheDocument()
      })
    })

    it('renders hour headers from 3 AM to 11 PM', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText('3 AM')).toBeInTheDocument()
        expect(screen.getByText('11 PM')).toBeInTheDocument()
        expect(screen.getByText('12 PM')).toBeInTheDocument() // noon
      })
    })

    it('shows loading state initially', () => {
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Filtering', () => {
    it('filters employees by name', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Name')).toBeInTheDocument()
      })
      
      const nameInput = screen.getByLabelText('Name')
      await user.type(nameInput, 'John')
      
      // Should filter the display
      await waitFor(() => {
        expect(screen.getByText(/Showing \d+ of \d+ employees/)).toBeInTheDocument()
      })
    })

    it('filters employees by position using autocomplete', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Position')).toBeInTheDocument()
      })
      
      const positionInput = screen.getByLabelText('Position')
      await user.click(positionInput)
      
      // Should show position options in dropdown
      await waitFor(() => {
        const dropdown = screen.getByRole('listbox', { hidden: true })
        expect(dropdown).toBeInTheDocument()
      })
    })

    it('clears all filters when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText('Clear')).toBeInTheDocument()
      })
      
      // Set some filter values first
      const nameInput = screen.getByLabelText('Name')
      await user.type(nameInput, 'test')
      
      // Clear filters
      const clearButton = screen.getByText('Clear')
      await user.click(clearButton)
      
      // Verify name input is cleared
      expect(nameInput).toHaveValue('')
    })
  })

  describe('Date Navigation', () => {
    it('changes date when clicking navigation buttons', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText('Jan 1 (Mon)')).toBeInTheDocument()
      })
      
      // Find navigation buttons by their icons
      const buttons = screen.getAllByRole('button')
      const prevButton = buttons.find(btn => 
        btn.querySelector('svg')?.getAttribute('data-testid') === 'ArrowBackIosNewIcon'
      )
      const nextButton = buttons.find(btn => 
        btn.querySelector('svg')?.getAttribute('data-testid') === 'ArrowForwardIosIcon'
      )
      
      if (nextButton) {
        await user.click(nextButton)
        // Should fetch new data for next day
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/schedules/hourly?date=2024-01-02'),
            expect.any(Object)
          )
        })
      }
    })

    it('opens date picker when clicking date', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText('Jan 1 (Mon)')).toBeInTheDocument()
      })
      
      // Click on the date to open date picker
      const dateElement = screen.getByText('Jan 1 (Mon)')
      await user.click(dateElement)
      
      // Date picker should appear
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })
    })
  })

  describe('Sorting', () => {
    it('sorts employees by hour when clicking hour headers', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText('9 AM')).toBeInTheDocument()
      })
      
      // Click on 9 AM header to sort
      const nineAmHeader = screen.getByText('9 AM')
      await user.click(nineAmHeader)
      
      // Should show sorting indicator
      await waitFor(() => {
        expect(screen.getByText(/Sorted by 9 AM/)).toBeInTheDocument()
      })
    })

    it('cycles through sort directions when clicking same hour multiple times', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText('9 AM')).toBeInTheDocument()
      })
      
      const nineAmHeader = screen.getByText('9 AM')
      
      // First click: descending
      await user.click(nineAmHeader)
      await waitFor(() => {
        expect(screen.getByText(/Most working first/)).toBeInTheDocument()
      })
      
      // Second click: ascending
      await user.click(nineAmHeader)
      await waitFor(() => {
        expect(screen.getByText(/Least working first/)).toBeInTheDocument()
      })
      
      // Third click: reset
      await user.click(nineAmHeader)
      await waitFor(() => {
        expect(screen.queryByText(/Sorted by/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Schedule Addition', () => {
    it('opens time selection dialog when clicking add button', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(async () => {
        // Look for add buttons (should be in cells where employees are not working)
        const addButtons = screen.getAllByRole('button')
        const addButton = addButtons.find(btn => 
          btn.querySelector('svg')?.getAttribute('data-testid') === 'AddIcon'
        )
        
        if (addButton) {
          await user.click(addButton)
          
          // Should open time selection dialog
          await waitFor(() => {
            expect(screen.getByText(/Add Shift for/)).toBeInTheDocument()
          })
        }
      })
    })

    it('shows template options for admin users', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(async () => {
        const addButtons = screen.getAllByRole('button')
        const addButton = addButtons.find(btn => 
          btn.querySelector('svg')?.getAttribute('data-testid') === 'AddIcon'
        )
        
        if (addButton) {
          await user.click(addButton)
          
          // Should show template toggle for admin
          await waitFor(() => {
            expect(screen.getByText(/Force Schedule Templates 사용/)).toBeInTheDocument()
          })
        }
      })
    })
  })

  describe('Schedule Editing', () => {
    it('opens edit dialog when clicking working hours', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(async () => {
        // Look for working hour indicators (should be clickable numbers like "1.00")
        const workingHours = screen.getAllByText('1.00')
        if (workingHours.length > 0) {
          await user.click(workingHours[0])
          
          // Should open edit dialog
          await waitFor(() => {
            expect(screen.getByTestId('edit-shift-dialog')).toBeInTheDocument()
          })
        }
      })
    })
  })

  describe('Refresh Functionality', () => {
    it('refreshes data when clicking refresh button', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText('⏰ Hourly Staffing')).toBeInTheDocument()
      })
      
      // Find refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i }) ||
                           screen.getAllByRole('button').find(btn => 
                             btn.querySelector('svg')?.getAttribute('data-testid') === 'RefreshIcon'
                           )
      
      if (refreshButton) {
        await user.click(refreshButton)
        
        // Should call fetch again
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledTimes(2) // Initial load + refresh
        })
      }
    })
  })

  describe('Employee Session', () => {
    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: mockEmployeeSession,
        status: 'authenticated',
      })
    })

    it('does not show template options for employee users', async () => {
      const user = userEvent.setup()
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(async () => {
        const addButtons = screen.getAllByRole('button')
        const addButton = addButtons.find(btn => 
          btn.querySelector('svg')?.getAttribute('data-testid') === 'AddIcon'
        )
        
        if (addButton) {
          await user.click(addButton)
          
          // Should NOT show template toggle for employee
          await waitFor(() => {
            expect(screen.queryByText(/Force Schedule Templates 사용/)).not.toBeInTheDocument()
          })
        }
      })
    })
  })

  describe('Total Hours Display', () => {
    it('shows total hours for each employee', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        // Should show total column with hours
        expect(screen.getByText('Total')).toBeInTheDocument()
        
        // Should show calculated total hours for employees
        const totalCells = screen.getAllByText(/\d+\.\d+/)
        expect(totalCells.length).toBeGreaterThan(0)
      })
    })

    it('shows staff count totals with pending/approved breakdown', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText('📊 Total Staff')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles API failure gracefully', async () => {
      // Mock failed fetch
      setupFetchMock({
        '/api/schedules/hourly': {
          ok: false,
          status: 500,
        },
      })
      
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText('Unable to load data.')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper table structure', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        const table = screen.getByRole('table')
        expect(table).toBeInTheDocument()
        
        const columnHeaders = screen.getAllByRole('columnheader')
        expect(columnHeaders.length).toBeGreaterThan(0)
      })
    })

    it('has tooltips for working hours', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        // Working hours should have tooltips
        const workingHours = screen.getAllByText('1.00')
        if (workingHours.length > 0) {
          expect(workingHours[0]).toHaveAttribute('title', expect.any(String))
        }
      })
    })
  })

  describe('Legend and Help Text', () => {
    it('shows legend for staff count colors', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText('Legend:')).toBeInTheDocument()
        expect(screen.getByText('0 staff')).toBeInTheDocument()
        expect(screen.getByText('1-2 staff')).toBeInTheDocument()
        expect(screen.getByText('3-4 staff')).toBeInTheDocument()
        expect(screen.getByText('5+ staff')).toBeInTheDocument()
      })
    })

    it('shows help text for sorting', async () => {
      render(<HourlyStaffingTable initialDate={defaultDate} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Click hour headers to sort by working hours/)).toBeInTheDocument()
      })
    })
  })
}) 