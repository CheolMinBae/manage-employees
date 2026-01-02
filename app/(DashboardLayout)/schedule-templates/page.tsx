'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface ScheduleTemplate {
  _id: string;
  name: string;
  displayName: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  order: number;
}

export default function ScheduleTemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 권한 체크
  useEffect(() => {
    if (status === 'loading') return; // 세션 로딩 중
    
    if (!session) {
      router.push('/auth/login');
      return;
    }
    
    if (session.user?.position !== 'admin') {
      router.push('/'); // admin이 아니면 대시보드로 리다이렉트
      return;
    }
  }, [session, status, router]);
  
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    startTime: '',
    endTime: '',
    isActive: true,
    order: 0
  });

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/schedule-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      showSnackbar('Failed to fetch templates', 'error');
    }
  };



  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleEdit = (template: ScheduleTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      displayName: template.displayName,
      startTime: template.startTime,
      endTime: template.endTime,
      isActive: template.isActive,
      order: template.order
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        const res = await fetch(`/api/schedule-templates?id=${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          fetchTemplates();
          showSnackbar('Template deleted successfully', 'success');
        } else {
          const errorData = await res.json();
          showSnackbar(errorData.error || 'Failed to delete template', 'error');
        }
      } catch (error) {
        console.error('Failed to delete template:', error);
        showSnackbar('Failed to delete template', 'error');
      }
    }
  };

  const handleSave = async () => {
    try {
      const url = '/api/schedule-templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const dataToSend = editingTemplate
        ? { ...formData, id: editingTemplate._id }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      const result = await res.json();

      if (!res.ok) {
        showSnackbar(result.error || 'Failed to save template', 'error');
        return;  // ERROR일 때 dialog 닫히지 않게
      }

      // 성공한 경우
      showSnackbar(
        `Template ${editingTemplate ? 'updated' : 'created'} successfully`,
        'success'
      );

      setOpenDialog(false);
      setEditingTemplate(null);
      setFormData({
        name: '',
        displayName: '',
        startTime: '00:00',
        endTime: '00:00',
        isActive: true,
        order: templates.length
      });

      fetchTemplates();

    } catch (error) {
      console.error('Failed to save template:', error);
      showSnackbar('Failed to save template', 'error');
    }
  };

  
  
  
  // const handleSave = async () => {
  //   try {
  //     const url = editingTemplate 
  //       ? '/api/schedule-templates'
  //       : '/api/schedule-templates';
      
  //     const method = editingTemplate ? 'PUT' : 'POST';
  //     const dataToSend = editingTemplate 
  //       ? { ...formData, id: editingTemplate._id }
  //       : formData;
      
  //     const res = await fetch(url, {
  //       method,
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(dataToSend)
  //     });

  //     if (res.ok) {
  //       setOpenDialog(false);
  //       setEditingTemplate(null);
  //       setFormData({
  //         name: '',
  //         displayName: '',
  //         startTime: '',
  //         endTime: '',
  //         isActive: true,
  //         order: 0
  //       });
  //       fetchTemplates();
  //       showSnackbar(
  //         `Template ${editingTemplate ? 'updated' : 'created'} successfully`,
  //         'success'
  //       );
  //     } else {
  //       const errorData = await res.json();
  //       showSnackbar(errorData.error || 'Failed to save template', 'error');
  //     }
  //   } catch (error) {
  //     console.error('Failed to save template:', error);
  //     showSnackbar('Failed to save template', 'error');
  //   }
  // };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTemplateStatus = async (template: ScheduleTemplate) => {
    try {
      const res = await fetch('/api/schedule-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: template._id,
          isActive: !template.isActive
        })
      });

      if (res.ok) {
        fetchTemplates();
        showSnackbar(
          `Template ${!template.isActive ? 'activated' : 'deactivated'}`,
          'success'
        );
      }
    } catch (error) {
      console.error('Failed to toggle template status:', error);
      showSnackbar('Failed to update template status', 'error');
    }
  };

  useEffect(() => {
    fetchTemplates();
    setLoading(false);
  }, []);

  // 세션 로딩 중이거나 권한이 없는 경우 처리
  if (status === 'loading' || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!session || session.user?.position !== 'admin') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography variant="h6" color="error">
          접근 거부: 관리자 권한이 필요합니다
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Typography variant="h4" mb={4}>⏰ Schedule Template Management</Typography>

      {/* Templates Management */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">📋 Schedule Templates</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingTemplate(null);
            setFormData({
              name: '',
              displayName: '',
              startTime: '',
              endTime: '',
              isActive: true,
              order: templates.length
            });
            setOpenDialog(true);
          }}
        >
          Add Template
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Display Name</strong></TableCell>
              <TableCell><strong>Time Range</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template._id}>
                <TableCell>
                  <Typography fontWeight="bold">{template.name}</Typography>
                </TableCell>
                <TableCell>{template.displayName}</TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {template.startTime} - {template.endTime}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant={template.isActive ? "contained" : "outlined"}
                    color={template.isActive ? "success" : "inherit"}
                    onClick={() => toggleTemplateStatus(template)}
                  >
                    {template.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Button>
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(template)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    onClick={() => handleDelete(template._id)} 
                    size="small" 
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No templates found. Create your first template to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTemplate ? 'Edit Template' : 'Add New Template'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Template Name (ID)"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              fullWidth
              helperText="Short identifier (e.g., A, B, C, MORNING, EVENING)"
            />
            <TextField
              label="Display Name"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              fullWidth
              helperText="Descriptive name (e.g., Morning Shift, Evening Shift)"
            />
            <TextField
              label="Start Time"
              type="time"
              value={formData.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Time"
              type="time"
              value={formData.endTime}
              onChange={(e) => handleChange('endTime', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Order"
              type="number"
              value={formData.order}
              onChange={(e) => handleChange('order', parseInt(e.target.value) || 0)}
              fullWidth
              helperText="Display order (lower numbers appear first)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingTemplate ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 