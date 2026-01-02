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
  Stack
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Corporation {
  _id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function CorporationManagement() {
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCorporation, setEditingCorporation] = useState<Corporation | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

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

  useEffect(() => {
    fetchCorporations();
  }, []);

  const handleEdit = (corporation: Corporation) => {
    setEditingCorporation(corporation);
    setFormData({
      name: corporation.name,
      description: corporation.description || ''
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this corporation?')) {
      try {
        const res = await fetch('/api/corporation', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _id: id })
        });
        if (res.ok) {
          fetchCorporations();
        }
      } catch (error) {
        console.error('Failed to delete corporation:', error);
      }
    }
  };

  const handleSave = async () => {
    try {
      const method = editingCorporation ? 'PUT' : 'POST';
      const body = editingCorporation 
        ? { _id: editingCorporation._id, ...formData }
        : formData;
      
      const res = await fetch('/api/corporation', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setOpenDialog(false);
        setEditingCorporation(null);
        setFormData({
          name: '',
          description: ''
        });
        fetchCorporations();
      }
    } catch (error) {
      console.error('Failed to save corporation:', error);
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
        <Typography variant="h6">🏢 Corporation Management</Typography>
        <Button 
          variant="contained" 
          onClick={() => {
            setEditingCorporation(null);
            setFormData({
              name: '',
              description: ''
            });
            setOpenDialog(true);
          }}
        >
          Add Corporation
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Updated At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {corporations.map((corporation) => (
              <TableRow key={corporation._id}>
                <TableCell>
                  <Typography fontWeight="bold">{corporation.name}</Typography>
                </TableCell>
                <TableCell>{corporation.description || '-'}</TableCell>
                <TableCell>{formatDate(corporation.createdAt)}</TableCell>
                <TableCell>{formatDate(corporation.updatedAt)}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(corporation)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(corporation._id)} size="small" color="error">
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
          {editingCorporation ? 'Edit Corporation' : 'Add Corporation'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Full Name"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingCorporation ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}