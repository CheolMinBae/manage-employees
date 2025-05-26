'use client';

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Paper, Box, Chip, Stack, IconButton, Grid, FormControl,
  InputLabel, Select, MenuItem, TextField, Button
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import ApprovalDialog from '@/app/(DashboardLayout)/components/approve/ApprovalDialog';
import EditShiftDialog from '@/app/(DashboardLayout)/components/schedule/EditShiftDialog';

interface ShiftSlot {
  _id: string;
  start: string;
  end: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface DailyShift {
  date: string;
  slots: ShiftSlot[];
}

interface UserSchedule {
  userId: string;
  name: string;
  position: string;
  corp: string;
  eid: number | string;
  category: string;
  shifts: DailyShift[];
}

interface WorkSession {
  start: Dayjs | null;
  end: Dayjs | null;
}

interface WeeklyScheduleTableProps {
  weekRange: string;
  dates: string[];
  scheduleData: UserSchedule[];
  weekStart: Date;
  onWeekChange: (dir: 'prev' | 'next') => void;
}

export default function WeeklyScheduleTable({
  weekRange,
  dates,
  scheduleData,
  weekStart,
  onWeekChange,
}: WeeklyScheduleTableProps) {
  const { data: session } = useSession();
  const userPosition = session?.user?.position;
  const userName = session?.user?.name;

  const [filterType, setFilterType] = useState<'name' | 'corp' | 'category' | 'eid'>('name');
  const [keyword, setKeyword] = useState('');
  const [trigger, setTrigger] = useState(0);

  const [approvalOpen, setApprovalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [selectedShiftInfo, setSelectedShiftInfo] = useState<{
    _id: string;
    date: string;
    start: string;
    end: string;
  } | null>(null);

  const filteredData = useMemo(() => {
    if (userPosition === 'employee') {
      return scheduleData.filter((u) => u.name === userName);
    }
    const filtered = scheduleData.filter((u) =>
      ['employee', 'barista'].includes(u.position?.toLowerCase())
    );
    if (!keyword.trim()) return filtered;
    return filtered.filter((u) => {
      const target = String(u[filterType]).toLowerCase();
      return target.includes(keyword.trim().toLowerCase());
    });
  }, [scheduleData, filterType, keyword, userPosition, userName, trigger]);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const getShiftsForDate = (shifts: DailyShift[], date: string) => {
    const entry = shifts.find((s) => s.date === date);
    return entry?.slots ?? [];
  };

  const getColorByStatus = (status: ShiftSlot['status']) => {
    switch (status) {
      case 'approved': return '#2e7d32';
      case 'pending': return '#f9a825';
      case 'rejected': return '#c62828';
      default: return '#000';
    }
  };

  const handleSlotClick = (slot: ShiftSlot, user: UserSchedule, date: string) => {
    if (slot.status === 'pending') {
      setStartTime(dayjs(`${date}T${slot.start}`));
      setEndTime(dayjs(`${date}T${slot.end}`));
      setSelectedShiftInfo({
        _id: slot._id,
        date,
        start: slot.start,
        end: slot.end,
      });
      if (userPosition === 'admin') {
        setApprovalOpen(true);
      } else if (userPosition === 'employee') {
        setEditModalOpen(true);
      }
    }
  };

  const handleApprove = async (sessions?: WorkSession[]) => {
    if (!selectedShiftInfo) return;

    if (sessions && sessions.length > 1) {
      // Handle separated sessions
      const firstSession = sessions[0];
      const secondSession = sessions[1];

      // Create two separate schedule entries
      const firstSchedule = {
        userId: selectedShiftInfo._id,
        date: selectedShiftInfo.date,
        start: firstSession.start?.format('HH:mm'),
        end: firstSession.end?.format('HH:mm'),
        approved: true
      };

      const secondSchedule = {
        userId: selectedShiftInfo._id,
        date: selectedShiftInfo.date,
        start: secondSession.start?.format('HH:mm'),
        end: secondSession.end?.format('HH:mm'),
        approved: true
      };

      // Delete the original schedule
      await fetch(`/api/schedules?id=${selectedShiftInfo._id}`, {
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
          ...selectedShiftInfo,
          approved: true,
        }),
      });
    }

    setApprovalOpen(false);
    window.location.reload();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">🗓️ Weekly Schedule</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={() => onWeekChange('prev')}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <Typography variant="body1" fontWeight="bold">{weekRange}</Typography>
          <IconButton onClick={() => onWeekChange('next')}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {userPosition === 'admin' && (
        <Grid container spacing={2} alignItems="center" mb={3}>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Filter by</InputLabel>
              <Select
                label="Filter by"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="corp">Corp</MenuItem>
                <MenuItem value="category">Category</MenuItem>
                <MenuItem value="eid">EID</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setTrigger((t) => t + 1)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="contained" onClick={() => setTrigger((t) => t + 1)}>
              Search
            </Button>
          </Grid>
        </Grid>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Position</strong></TableCell>
              {dates.map((date) => (
                <TableCell key={date} align="center">
                  <strong>{formatDateHeader(date)}</strong>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((user, i) => (
              <TableRow key={`${user.name}-${i}`}>
                <TableCell>
                  <Typography fontWeight="bold">{user.name}</Typography>
                  <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
                    <Chip label={user.corp} size="small" variant="outlined" />
                    <Chip label={`EID: ${user.eid}`} size="small" variant="outlined" />
                    <Chip label={user.category} size="small" variant="outlined" />
                  </Stack>
                </TableCell>
                <TableCell>{user.position}</TableCell>
                {dates.map((date) => {
                  const shifts = getShiftsForDate(user.shifts, date);
                  return (
                    <TableCell key={date} align="center">
                      {shifts.length > 0 ? (
                        <Box display="flex" flexDirection="column" gap={0.5}>
                          {shifts.map((slot, idx) => (
                            <Typography
                              key={idx}
                              variant="body2"
                              sx={{ color: getColorByStatus(slot.status), cursor: slot.status === 'pending' ? 'pointer' : 'default' }}
                              onClick={() => handleSlotClick(slot, user, date)}
                            >
                              {slot.start}–{slot.end}
                            </Typography>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary"></Typography>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ApprovalDialog
        open={approvalOpen}
        onClose={() => setApprovalOpen(false)}
        startTime={startTime}
        endTime={endTime}
        setStartTime={setStartTime}
        setEndTime={setEndTime}
        onApprove={handleApprove}
      />

      {selectedShiftInfo && (
        <EditShiftDialog
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          slot={selectedShiftInfo}
          fetchSchedules={() => window.location.reload()}
        />
      )}
    </Box>
  );
}
