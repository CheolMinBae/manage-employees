'use client';

import { useState, useEffect } from 'react';
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
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  FormControlLabel
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// 권한 목록 정의
const PERMISSIONS = {
  // 스케줄 관련
  'schedule:view': '스케줄 조회',
  'schedule:create': '스케줄 생성',
  'schedule:edit': '스케줄 수정',
  'schedule:delete': '스케줄 삭제',
  'schedule:approve': '스케줄 승인',
  
  // 직원 관련
  'employee:view': '직원 조회',
  'employee:create': '직원 생성',
  'employee:edit': '직원 수정',
  'employee:delete': '직원 삭제',
  
  // 설정 관련
  'settings:view': '설정 조회',
  'settings:edit': '설정 수정',
  
  // 리포트 관련
  'report:view': '리포트 조회',
  'report:download': '리포트 다운로드',
} as const;

const PERMISSION_GROUPS = {
  '스케줄': ['schedule:view', 'schedule:create', 'schedule:edit', 'schedule:delete', 'schedule:approve'],
  '직원': ['employee:view', 'employee:create', 'employee:edit', 'employee:delete'],
  '설정': ['settings:view', 'settings:edit'],
  '리포트': ['report:view', 'report:download'],
};

interface Category {
  _id: string;
  key: string;
  name: string;
}

interface UserRole {
  _id: string;
  key: string;
  name: string;
  description?: string;
  permissions?: string[];
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function UserRoleManagement() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    permissions: [] as string[],
    category: ''
  });

  // 필터 상태
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

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

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/category');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    fetchUserRoles();
    fetchCategories();
  }, []);

  // 필터링된 역할 목록
  const filteredRoles = userRoles.filter(role => {
    if (categoryFilter.length === 0) return true;
    return categoryFilter.includes(role.category || '');
  });

  const handleEdit = (role: UserRole) => {
    setEditingRole(role);
    setFormData({
      key: role.key,
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
      category: role.category || ''
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user role?')) {
      try {
        const res = await fetch('/api/userrole', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _id: id })
        });
        if (res.ok) {
          fetchUserRoles();
        }
      } catch (error) {
        console.error('Failed to delete user role:', error);
      }
    }
  };

  const handleSave = async () => {
    try {
      const method = editingRole ? 'PUT' : 'POST';
      const body = editingRole 
        ? { _id: editingRole._id, ...formData }
        : formData;
      
      const res = await fetch('/api/userrole', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setOpenDialog(false);
        setEditingRole(null);
        setFormData({
          key: '',
          name: '',
          description: '',
          permissions: [],
          category: ''
        });
        fetchUserRoles();
      }
    } catch (error) {
      console.error('Failed to save user role:', error);
    }
  };

  const handleChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionToggle = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const handleGroupPermissionToggle = (groupPermissions: string[]) => {
    const allSelected = groupPermissions.every(p => formData.permissions.includes(p));
    setFormData(prev => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !groupPermissions.includes(p))
        : Array.from(new Set([...prev.permissions, ...groupPermissions]))
    }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">👤 User Role Management</Typography>
        <Button 
          variant="contained" 
          onClick={() => {
            setEditingRole(null);
            setFormData({
              key: '',
              name: '',
              description: '',
              permissions: [],
              category: ''
            });
            setOpenDialog(true);
          }}
        >
          Add User Role
        </Button>
      </Box>

      {/* Category Filter */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="subtitle2">🔍 Filter by Category:</Typography>
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel>Categories</InputLabel>
            <Select
              multiple
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Categories" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value || 'No Category'} size="small" />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="">
                <Checkbox checked={categoryFilter.includes('')} />
                <ListItemText primary="No Category" />
              </MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat._id} value={cat.name}>
                  <Checkbox checked={categoryFilter.includes(cat.name)} />
                  <ListItemText primary={cat.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {categoryFilter.length > 0 && (
            <Button size="small" onClick={() => setCategoryFilter([])}>
              Clear
            </Button>
          )}
          <Typography variant="caption" color="text.secondary">
            Showing {filteredRoles.length} of {userRoles.length} roles
          </Typography>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Permissions</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRoles.map((role) => (
              <TableRow key={role._id}>
                <TableCell>
                  <Chip 
                    label={role.key} 
                    variant="outlined" 
                    size="small"
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">{role.name}</Typography>
                </TableCell>
                <TableCell>
                  {role.category ? (
                    <Chip label={role.category} size="small" color="secondary" variant="outlined" />
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 200 }}>
                    {(role.permissions || []).slice(0, 3).map((perm) => (
                      <Chip 
                        key={perm} 
                        label={PERMISSIONS[perm as keyof typeof PERMISSIONS] || perm} 
                        size="small" 
                        sx={{ fontSize: '0.65rem' }}
                      />
                    ))}
                    {(role.permissions || []).length > 3 && (
                      <Chip 
                        label={`+${(role.permissions || []).length - 3}`} 
                        size="small" 
                        color="primary"
                        sx={{ fontSize: '0.65rem' }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>{role.description || '-'}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(role)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(role._id)} size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRole ? 'Edit User Role' : 'Add User Role'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Box display="flex" gap={2}>
              <TextField
                label="Key"
                value={formData.key}
                onChange={(e) => handleChange('key', e.target.value)}
                fullWidth
                required
                helperText="Unique identifier (e.g., 'barista', 'manager')"
              />
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                fullWidth
                required
                helperText="Display name (e.g., 'Barista', 'Manager')"
              />
            </Box>
            
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                label="Category"
              >
                <MenuItem value="">
                  <em>No Category</em>
                </MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat._id} value={cat.name}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              fullWidth
              multiline
              rows={2}
            />

            {/* Permissions Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                🔐 Permissions ({formData.permissions.length} selected)
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                {Object.entries(PERMISSION_GROUPS).map(([groupName, groupPermissions]) => {
                  const allSelected = groupPermissions.every(p => formData.permissions.includes(p));
                  const someSelected = groupPermissions.some(p => formData.permissions.includes(p));
                  
                  return (
                    <Accordion key={groupName} defaultExpanded={someSelected} disableGutters elevation={0}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <FormControlLabel
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                          control={
                            <Checkbox
                              checked={allSelected}
                              indeterminate={someSelected && !allSelected}
                              onChange={() => handleGroupPermissionToggle(groupPermissions)}
                            />
                          }
                          label={<Typography fontWeight="bold">{groupName}</Typography>}
                        />
                      </AccordionSummary>
                      <AccordionDetails sx={{ pl: 4 }}>
                        <FormGroup>
                          {groupPermissions.map((perm) => (
                            <FormControlLabel
                              key={perm}
                              control={
                                <Checkbox
                                  size="small"
                                  checked={formData.permissions.includes(perm)}
                                  onChange={() => handlePermissionToggle(perm)}
                                />
                              }
                              label={
                                <Typography variant="body2">
                                  {PERMISSIONS[perm as keyof typeof PERMISSIONS]}
                                </Typography>
                              }
                            />
                          ))}
                        </FormGroup>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Paper>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingRole ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 