'use client';

import {
  Box, Button, Typography, Stack, Chip, Grid, Paper
} from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

interface TimeSlot {
  _id: string;
  userId: string;
  date: string;
  start: string;
  end: string;
  approved: boolean;
}

export default function ScheduleApprovalPage() {
  const [schedules, setSchedules] = useState<TimeSlot[]>([]);

  const fetchAllSchedules = async () => {
    const res = await fetch('/api/schedules');
    const data: TimeSlot[] = await res.json();
    setSchedules(data);
  };

  const handleApprove = async (id: string, approve: boolean) => {
    await fetch('/api/schedules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, approved: approve }),
    });
    fetchAllSchedules();
  };

  useEffect(() => {
    fetchAllSchedules();
  }, []);

  const grouped = schedules.reduce((acc, curr) => {
    if (!acc[curr.userId]) acc[curr.userId] = [];
    acc[curr.userId].push(curr);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  return (
    <Box p={4}>
      <Typography variant="h4" mb={4}>🧾 Schedule Approval</Typography>

      {Object.entries(grouped).map(([userId, userSchedules]) => (
        <Box key={userId} mb={4}>
          <Typography variant="h6" mb={1}>👤 User: {userId}</Typography>
          <Stack spacing={1}>
            {userSchedules.map((slot) => (
              <Paper key={slot._id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography fontWeight="bold">
                    {dayjs(slot.date).format('MMM D')} {slot.start} ~ {slot.end}
                  </Typography>
                  <Chip
                    label={slot.approved ? 'Approved' : 'Pending'}
                    size="small"
                    color={slot.approved ? 'success' : 'warning'}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    color="success"
                    size="small"
                    disabled={slot.approved}
                    onClick={() => handleApprove(slot._id, true)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    disabled={!slot.approved}
                    onClick={() => handleApprove(slot._id, false)}
                  >
                    Reject
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
