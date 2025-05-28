'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

interface Employee {
  _id: string;
  name: string;
  email: string;
  position: string;
  userType: string;
  corp: string;
  eid: string;
  category: string;
  createdAt?: string;
}

interface Corporation {
  _id: string;
  name: string;
  description?: string;
}

interface UserRole {
  _id: string;
  key: string;
  name: string;
  description?: string;
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    position: 'employee',
    userType: '',
    corp: '',
    eid: '',
    category: ''
  });

  // 검색 관련 상태
  const [searchType, setSearchType] = useState<string>('name');
  const [searchValue, setSearchValue] = useState<string>('');

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchCorporations = async () => {
    try {
      const res = await fetch('/api/corporation');
      if (res.ok) {
        const data = await res.json();
        setCorporations(data);
      }
    } catch (error) {
      console.error('Failed to fetch corporations:', error);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const res = await fetch('/api/userrole');
      if (res.ok) {
        const data = await res.json();
        setUserRoles(data);
      }
    } catch (error) {
      console.error('Failed to fetch user roles:', error);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchCorporations();
    fetchUserRoles();
  }, []);

  // 검색 필터링된 직원 목록
  const filteredEmployees = useMemo(() => {
    if (!searchValue.trim()) {
      return employees;
    }

    return employees.filter((employee) => {
      const value = searchValue.toLowerCase().trim();
      
      switch (searchType) {
        case 'name':
          return employee.name.toLowerCase().includes(value);
        case 'email':
          return employee.email.toLowerCase().includes(value);
        case 'eid':
          return employee.eid.toLowerCase().includes(value);
        case 'position':
          return employee.position.toLowerCase() === value;
        case 'userType':
          return employee.userType.toLowerCase() === value;
        case 'corp':
          return employee.corp.toLowerCase() === value;
        default:
          return true;
      }
    });
  }, [employees, searchType, searchValue]);

  // 검색 초기화
  const handleClearSearch = () => {
    setSearchValue('');
    setSearchType('name');
  };

  // 검색 타입에 따른 입력 필드 렌더링
  const renderSearchInput = () => {
    const inputTypes = ['name', 'email', 'eid'];
    const selectTypes = ['position', 'userType', 'corp'];

    if (inputTypes.includes(searchType)) {
      return (
        <TextField
          label={`Search by ${searchType.charAt(0).toUpperCase() + searchType.slice(1)}`}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
          InputProps={{
            endAdornment: searchValue && (
              <IconButton size="small" onClick={() => setSearchValue('')}>
                <ClearIcon fontSize="small" />
              </IconButton>
            )
          }}
        />
      );
    }

    if (selectTypes.includes(searchType)) {
      let options: { value: string; label: string }[] = [];
      
      if (searchType === 'position') {
        options = [
          { value: 'employee', label: 'Employee' },
          { value: 'admin', label: 'Admin' }
        ];
      } else if (searchType === 'userType') {
        options = userRoles.map(role => ({ value: role.key, label: role.name }));
      } else if (searchType === 'corp') {
        options = corporations.map(corp => ({ value: corp.name, label: corp.name }));
      }

      return (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Select {searchType.charAt(0).toUpperCase() + searchType.slice(1)}</InputLabel>
          <Select
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            label={`Select ${searchType.charAt(0).toUpperCase() + searchType.slice(1)}`}
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    return null;
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      password: '',
      position: employee.position,
      userType: employee.userType,
      corp: employee.corp,
      eid: employee.eid,
      category: employee.category
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this employee? This will also delete all their schedules.')) {
      try {
        const res = await fetch(`/api/users?id=${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          fetchEmployees();
          alert('Employee and all associated schedules have been deleted successfully.');
        } else {
          const errorData = await res.json();
          alert(`Failed to delete employee: ${errorData.message}`);
        }
      } catch (error) {
        console.error('Failed to delete employee:', error);
        alert('Failed to delete employee. Please try again.');
      }
    }
  };

  const handleSave = async () => {
    try {
      const url = editingEmployee 
        ? `/api/users?id=${editingEmployee._id}`
        : '/api/users';
      
      const method = editingEmployee ? 'PUT' : 'POST';
      
      const dataToSend = editingEmployee && !formData.password 
        ? { ...formData, password: undefined }
        : formData;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      if (res.ok) {
        setOpenDialog(false);
        setEditingEmployee(null);
        setFormData({
          name: '',
          email: '',
          password: '',
          position: 'employee',
          userType: '',
          corp: '',
          eid: '',
          category: ''
        });
        fetchEmployees();
      }
    } catch (error) {
      console.error('Failed to save employee:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">👥 Employee Management</Typography>
        <Button 
          variant="contained" 
          onClick={() => {
            setEditingEmployee(null);
            setFormData({
              name: '',
              email: '',
              password: '1q2w3e4r',
              position: 'employee',
              userType: '',
              corp: '',
              eid: '',
              category: ''
            });
            setOpenDialog(true);
          }}
        >
          Add Employee
        </Button>
      </Box>

      {/* 검색 섹션 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SearchIcon /> Search Employees
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Search Type</InputLabel>
              <Select
                value={searchType}
                onChange={(e) => {
                  setSearchType(e.target.value);
                  setSearchValue('');
                }}
                label="Search Type"
              >
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="eid">EID</MenuItem>
                <MenuItem value="position">Position</MenuItem>
                <MenuItem value="userType">User Type</MenuItem>
                <MenuItem value="corp">Corporation</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            {renderSearchInput()}
          </Grid>
          <Grid item xs={12} sm={3}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={handleClearSearch}
                startIcon={<ClearIcon />}
                size="small"
              >
                Clear
              </Button>
              <Typography variant="body2" sx={{ alignSelf: 'center', color: 'text.secondary' }}>
                {filteredEmployees.length} / {employees.length} employees
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>User Type</TableCell>
              <TableCell>Corporation</TableCell>
              <TableCell>EID</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees.map((employee) => (
              <TableRow key={employee._id}>
                <TableCell>{employee.name}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.userType}</TableCell>
                <TableCell>
                  <Chip 
                    label={employee.position} 
                    color={employee.position === 'admin' ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{employee.corp}</TableCell>
                <TableCell>{employee.eid}</TableCell>
                <TableCell>{employee.category}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(employee)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(employee._id)} size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredEmployees.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {searchValue ? 'No employees found matching your search criteria.' : 'No employees found.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingEmployee ? 'Edit Employee' : 'Add Employee'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              fullWidth
            />
            {!editingEmployee && (
              <TextField
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                fullWidth
                helperText="Default password for new employees"
              />
            )}
            <TextField
              label="User Type"
              select
              value={formData.position}
              onChange={(e) => handleChange('position', e.target.value)}
              fullWidth
            >
              <MenuItem value="employee">Employee</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
            <TextField
              label="Position"
              select
              value={formData.userType}
              onChange={(e) => handleChange('userType', e.target.value)}
              fullWidth
            >
              {userRoles.map((role) => (
                <MenuItem key={role._id} value={role.key}>
                  {role.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Corporation"
              select
              value={formData.corp}
              onChange={(e) => handleChange('corp', e.target.value)}
              fullWidth
            >
              {corporations.map((corp) => (
                <MenuItem key={corp._id} value={corp.name}>
                  {corp.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="EID"
              value={formData.eid}
              onChange={(e) => handleChange('eid', e.target.value)}
              fullWidth
            />
            <TextField
              label="Category"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingEmployee ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 