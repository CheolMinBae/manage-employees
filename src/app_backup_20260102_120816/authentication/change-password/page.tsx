'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';

export default function ChangePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const isFirstLogin = searchParams.get('firstLogin') === 'true';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/authentication/login');
    }
  }, [status, router]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.currentPassword) {
      setError('Current password is required');
      return false;
    }
    if (!formData.newPassword) {
      setError('New password is required');
      return false;
    }
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: session?.user?.email,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          isFirstLogin
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password changed successfully!');
        setTimeout(() => {
          if (isFirstLogin) {
            router.push('/');
          } else {
            router.push('/settings');
          }
        }, 2000);
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (isFirstLogin) {
      router.push('/');
    } else {
      router.back();
    }
  };

  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="grey.100"
      p={2}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <LockResetIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              {isFirstLogin ? 'Change Your Password' : 'Update Password'}
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {isFirstLogin 
                ? 'For security reasons, please change your default password before continuing.'
                : 'Enter your current password and choose a new one.'
              }
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                label="Current Password"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => handleChange('currentPassword', e.target.value)}
                fullWidth
                required
                placeholder={isFirstLogin ? 'Enter your default password (1q2w3e4r)' : 'Enter current password'}
              />

              <TextField
                label="New Password"
                type="password"
                value={formData.newPassword}
                onChange={(e) => handleChange('newPassword', e.target.value)}
                fullWidth
                required
                helperText="Password must be at least 6 characters long"
              />

              <TextField
                label="Confirm New Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                fullWidth
                required
              />

              <Stack direction="row" spacing={2}>
                {isFirstLogin && (
                  <Button
                    variant="outlined"
                    onClick={handleSkip}
                    fullWidth
                    disabled={loading}
                  >
                    Skip for Now
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
} 