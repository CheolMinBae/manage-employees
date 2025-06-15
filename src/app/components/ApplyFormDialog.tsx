'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
} from '@mui/material';

interface ApplyFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ApplyFormDialog({ open, onClose }: ApplyFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit application');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({
          name: '',
          age: '',
          email: '',
          phone: '',
        });
      }, 2000);
    } catch (err) {
      setError('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Apply Now</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">Application submitted successfully!</Alert>}
          
          <TextField
            label="Name"
            value={formData.name}
            onChange={handleChange('name')}
            required
            fullWidth
          />
          <TextField
            label="Age"
            type="number"
            value={formData.age}
            onChange={handleChange('age')}
            required
            fullWidth
          />
          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            required
            fullWidth
          />
          <TextField
            label="Phone Number"
            value={formData.phone}
            onChange={handleChange('phone')}
            required
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || !formData.name || !formData.age || !formData.email || !formData.phone}
        >
          {loading ? 'Submitting...' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 