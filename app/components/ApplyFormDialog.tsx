'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  MenuItem,
  Grid,
  Typography,
  Alert,
} from '@mui/material';
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface WeeklyTime {
  from: string | null;
  to: string | null;
}

interface UserRole {
  _id: string;
  key: string;
  name: string;
  description?: string;
}

interface ApplyFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ApplyFormDialog({ open, onClose }: ApplyFormDialogProps) {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    position: string;
    startDate: dayjs.Dayjs | null;
    weekly: WeeklyTime[];
  }>({
    name: '',
    email: '',
    phone: '',
    position: '',
    startDate: null,
    weekly: weekDays.map(() => ({ from: null, to: null })),
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const timeOptions = Array.from({length: 36}, (_, i) => {
    const hour = Math.floor(i / 2) + 6;
    const min = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${min}`;
  });

  useEffect(() => {
    fetch('/api/userrole').then((res) => res.json()).then(setUserRoles);
  }, []);

  const handleWeeklyChange = (idx: number, field: 'from' | 'to', value: string) => {
    setForm((prev) => {
      const weekly = [...prev.weekly];
      weekly[idx][field] = value;
      return { ...prev, weekly };
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          startDate: form.startDate ? form.startDate.format('YYYY-MM-DD') : '',
          weekly: form.weekly,
        }),
      });
      if (!response.ok) throw new Error('Failed to submit');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (e) {
      setError('지원서 제출에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  function getHourDiff(from: string | null, to: string | null): string {
    if (!from || !to) return '';
    const [fh, fm] = from.split(':').map(Number);
    const [th, tm] = to.split(':').map(Number);
    const start = fh * 60 + fm;
    const end = th * 60 + tm;
    const diff = (end - start) / 60;
    if (diff > 0) return `${diff % 1 === 0 ? diff : diff.toFixed(1)}h`;
    return '';
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Apply Now</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">지원이 완료되었습니다!</Alert>}
            <TextField label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth required />
            <TextField label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} fullWidth required />
            <TextField label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} fullWidth required />
            <TextField
              label="Position Applied"
              select
              value={form.position}
              onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              fullWidth
              required
            >
              {userRoles.map(role => (
                <MenuItem key={role._id} value={role.name}>{role.name}</MenuItem>
              ))}
            </TextField>
            <DatePicker
              label="Earliest Start Date"
              value={form.startDate}
              onChange={date => setForm(f => ({ ...f, startDate: date }))}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <Typography variant="subtitle1" mt={2}>Weekly Availability</Typography>
            <Grid container spacing={2}>
              {weekDays.map((day: string, idx: number) => {
                const from = form.weekly[idx].from;
                const to = form.weekly[idx].to;
                // 시작시간/종료시간 둘 다 선택되지 않은 경우 전체 옵션
                const fromOptions = !to ? timeOptions : timeOptions.filter(opt => to !== null && opt < to);
                const toOptions = !from ? timeOptions : timeOptions.filter(opt => from !== null && opt > from);
                return (
                  <Grid item xs={12} key={day}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography sx={{ minWidth: 80 }}>{day}</Typography>
                      <TextField
                        select
                        size="small"
                        value={from || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleWeeklyChange(idx, 'from', e.target.value)}
                        sx={{ minWidth: 90 }}
                      >
                        <MenuItem value="">-</MenuItem>
                        {fromOptions.map((opt: string) => (
                          <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                      </TextField>
                      <span>~</span>
                      <TextField
                        select
                        size="small"
                        value={to || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleWeeklyChange(idx, 'to', e.target.value)}
                        sx={{ minWidth: 90 }}
                      >
                        <MenuItem value="">-</MenuItem>
                        {toOptions.map((opt: string) => (
                          <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                      </TextField>
                      <Typography sx={{ minWidth: 40, color: '#00704a', fontWeight: 600 }}>
                        {getHourDiff(from, to)}
                      </Typography>
                    </Stack>
                  </Grid>
                );
              })}
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
} 