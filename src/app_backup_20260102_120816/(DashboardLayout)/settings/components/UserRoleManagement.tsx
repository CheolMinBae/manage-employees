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
  Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface UserRole {
  _id: string;
  key: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function UserRoleManagement() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: ''
  });

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
    fetchUserRoles();
  }, []);

  const handleEdit = (role: UserRole) => {
    setEditingRole(role);
    setFormData({
      key: role.key,
      name: role.name,
      description: role.description || ''
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
          description: ''
        });
        fetchUserRoles();
      }
    } catch (error) {
      console.error('Failed to save user role:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
              description: ''
            });
            setOpenDialog(true);
          }}
        >
          Add User Role
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Updated At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {userRoles.map((role) => (
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
                <TableCell>{role.description || '-'}</TableCell>
                <TableCell>{formatDate(role.createdAt)}</TableCell>
                <TableCell>{formatDate(role.updatedAt)}</TableCell>
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

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRole ? 'Edit User Role' : 'Add User Role'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Key"
              value={formData.key}
              onChange={(e) => handleChange('key', e.target.value)}
              fullWidth
              required
              helperText="Unique identifier for the role (e.g., 'barista', 'manager')"
            />
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              fullWidth
              required
              helperText="Display name for the role (e.g., 'Barista', 'Manager')"
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              fullWidth
              multiline
              rows={3}
              helperText="Optional description of the role"
            />
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