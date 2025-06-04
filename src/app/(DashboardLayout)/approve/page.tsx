'use client';

import {
  Box, Button, Typography, Stack, Chip, Grid, Paper
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useEffect, useMemo, useState } from 'react';
import { startOfWeek, endOfWeek } from 'date-fns';
import { WEEK_OPTIONS } from '@/constants/dateConfig';
import FilterControls from '../components/approve/FilterControls';
import ApprovalDialog from '../components/approve/ApprovalDialog';

dayjs.extend(isBetween);

interface TimeSlot {
  _id: string;
  userId: string;
  name: string;
  date: string;
  start: string;
  end: string;
  approved: boolean;
}

interface WorkSession {
  start: Dayjs | null;
  end: Dayjs | null;
}

export default function ScheduleApprovalPage() {
  const [schedules, setSchedules] = useState<TimeSlot[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);

  const [selectedUsers, setSelectedUsers] = useState<string>('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [dateRange, setDateRange] = useState([
    {
      startDate: startOfWeek(new Date(), WEEK_OPTIONS),
      endDate: endOfWeek(new Date(), WEEK_OPTIONS),
      key: 'selection'
    }
  ]);

  const fetchAllSchedules = async () => {
    const res = await fetch('/api/schedules');
    const data: TimeSlot[] = await res.json();
    setSchedules(data);
  };

  const handleApproveConfirm = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStartTime(dayjs(`${slot.date}T${slot.start}`));
    setEndTime(dayjs(`${slot.date}T${slot.end}`));
    setOpenDialog(true);
  };

  const handleApprove = async (sessions?: WorkSession[]) => {
    if (!selectedSlot) return;

    if (sessions && sessions.length > 1) {
      // Handle separated sessions
      const firstSession = sessions[0];
      const secondSession = sessions[1];

      // Create two separate schedule entries
      const firstSchedule = {
        userId: selectedSlot.userId,
        name: selectedSlot.name,
        date: selectedSlot.date,
        start: firstSession.start?.format('HH:mm'),
        end: firstSession.end?.format('HH:mm'),
        approved: true
      };

      const secondSchedule = {
        userId: selectedSlot.userId,
        name: selectedSlot.name,
        date: selectedSlot.date,
        start: secondSession.start?.format('HH:mm'),
        end: secondSession.end?.format('HH:mm'),
        approved: true
      };

      // Delete the original schedule
      await fetch(`/api/schedules?id=${selectedSlot._id}`, {
        method: 'DELETE',
      });

      // Create two new schedules
      await Promise.all([
        fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(firstSchedule),
        }),
        fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(secondSchedule),
        })
      ]);
    } else {
      // Handle single session
      await fetch('/api/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSlot._id,
          approved: true,
          start: startTime?.format('HH:mm'),
          end: endTime?.format('HH:mm'),
        }),
      });
    }

    setOpenDialog(false);
    setSelectedSlot(null);
    fetchAllSchedules();
  };

  const handleReject = async (id: string) => {
    await fetch('/api/schedules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, approved: false }),
    });
    fetchAllSchedules();
  };

  const handleDelete = async () => {
    if (!selectedSlot) return;

    try {
      const response = await fetch(`/api/schedules?id=${selectedSlot._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      setOpenDialog(false);
      setSelectedSlot(null);
      fetchAllSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  useEffect(() => {
    fetchAllSchedules();
  }, []);

  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(schedules.map(s => s.name)));
  }, [schedules]);

  const filtered = useMemo(() => {
    const start = dayjs(dateRange[0].startDate).startOf('day');
    const end = dayjs(dateRange[0].endDate).endOf('day');

    return schedules.filter(s => {
      const matchUser = selectedUsers 
        ? s.name.toLowerCase().includes(selectedUsers.toLowerCase()) 
        : true;
      const matchStatus = selectedStatuses.length > 0
        ? selectedStatuses.includes(s.approved ? 'Approved' : 'Pending')
        : true;
      const matchDate =
        dateRange[0].startDate && dateRange[0].endDate
          ? dayjs(s.date).isBetween(start, end, 'day', '[]')
          : true;
      return matchUser && matchStatus && matchDate;
    });
  }, [schedules, selectedUsers, selectedStatuses, dateRange]);

  const grouped = filtered.reduce((acc, curr) => {
    if (!acc[curr.name]) acc[curr.name] = [];
    acc[curr.name].push(curr);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  const selectedUserSchedules = selectedUser ? grouped[selectedUser] || [] : [];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box p={4}>
        <Typography variant="h4" mb={4}>🧾 Schedule Approval</Typography>

        <FilterControls
          users={uniqueUsers}
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
          dateRange={dateRange}
          setDateRange={setDateRange}
          selectedStatuses={selectedStatuses}
          setSelectedStatuses={setSelectedStatuses}
        />

        <Grid container spacing={3} sx={{ height: 'calc(100vh - 300px)' }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ height: '100%', overflow: 'auto' }}>
              <Box p={2}>
                <Typography variant="h6" mb={2}>👥 Users ({Object.keys(grouped).length})</Typography>
                <Stack spacing={1}>
                  {Object.keys(grouped).map((userName) => (
                    <Paper
                      key={userName}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        backgroundColor: selectedUser === userName ? '#e3f2fd' : 'white',
                        border: selectedUser === userName ? '2px solid #1976d2' : '1px solid #e0e0e0',
                        '&:hover': {
                          backgroundColor: selectedUser === userName ? '#e3f2fd' : '#f5f5f5',
                        }
                      }}
                      onClick={() => setSelectedUser(userName)}
                    >
                      <Typography fontWeight="bold">{userName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {grouped[userName].length} schedule(s)
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ height: '100%', overflow: 'auto' }}>
              <Box p={2}>
                {selectedUser ? (
                  <>
                    <Typography variant="h6" mb={2}>
                      📅 {selectedUser}'s Schedules ({selectedUserSchedules.length})
                    </Typography>
                    <Stack spacing={2}>
                      {selectedUserSchedules.map((slot) => (
                        <Paper 
                          key={slot._id} 
                          sx={{ 
                            p: 2, 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            border: '1px solid #e0e0e0'
                          }}
                        >
                          <Box>
                            <Typography fontWeight="bold">
                              📅 {dayjs(slot.date).format('MMM D, YYYY')}
                            </Typography>
                            <Typography fontWeight="bold" color="primary">
                              🕐 {slot.start} ~ {slot.end}
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
                              onClick={() => handleApproveConfirm(slot)}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              disabled={!slot.approved}
                              onClick={() => handleReject(slot._id)}
                            >
                              Reject
                            </Button>
                          </Stack>
                        </Paper>
                      ))}
                      {selectedUserSchedules.length === 0 && (
                        <Box textAlign="center" py={4}>
                          <Typography variant="body1" color="text.secondary">
                            No schedules found for {selectedUser}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </>
                ) : (
                  <Box textAlign="center" py={8}>
                    <Typography variant="h6" color="text.secondary">
                      👈 Select a user from the left to view their schedules
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <ApprovalDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          startTime={startTime}
          endTime={endTime}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          onApprove={handleApprove}
          onDelete={handleDelete}
          selectedDate={selectedSlot?.date}
          userId={selectedSlot?.userId}
          currentScheduleId={selectedSlot?._id}
        />
      </Box>
    </LocalizationProvider>
  );
}
