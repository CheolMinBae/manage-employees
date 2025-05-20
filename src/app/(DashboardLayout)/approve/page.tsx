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

export default function ScheduleApprovalPage() {
  const [schedules, setSchedules] = useState<TimeSlot[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);

  const [selectedUsers, setSelectedUsers] = useState<string>('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState([
    {
      startDate: startOfWeek(new Date(), { weekStartsOn: 0 }),
      endDate: endOfWeek(new Date(), { weekStartsOn: 0 }),
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

  const handleApprove = async () => {
    if (!selectedSlot || !startTime || !endTime) return;
    await fetch('/api/schedules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedSlot._id,
        approved: true,
        start: startTime.format('HH:mm'),
        end: endTime.format('HH:mm'),
      }),
    });
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
      const matchUser = selectedUsers ? s.name === selectedUsers : true;
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

        {Object.entries(grouped).map(([name, userSchedules]) => (
          <Box key={name} mb={4}>
            <Typography variant="h6" mb={1}>👤 User: {name}</Typography>
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
            </Stack>
          </Box>
        ))}

        <ApprovalDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          startTime={startTime}
          endTime={endTime}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          onApprove={handleApprove}
        />
      </Box>
    </LocalizationProvider>
  );
}
