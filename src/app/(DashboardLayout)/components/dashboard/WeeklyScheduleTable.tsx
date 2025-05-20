'use client';

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Paper, Box, Chip, Stack, IconButton, Grid, FormControl,
  InputLabel, Select, MenuItem, TextField, Button
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';

interface ShiftSlot {
  start: string;
  end: string;
}

interface DailyShift {
  date: string;
  slots: ShiftSlot[];
}

interface UserSchedule {
  name: string;
  position: string;
  corp: string;
  eid: number | string;
  category: string;
  shifts: DailyShift[];
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

  const filteredData = useMemo(() => {
    if (userPosition === 'employee') {
      return scheduleData.filter((u) => u.name === userName);
    }
    if (!keyword.trim()) return scheduleData;
    return scheduleData.filter((u) => {
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

  return (
    <Box>
      {/* 타이틀 및 주간 이동 */}
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

      {/* 필터 영역 (관리자만 노출) */}
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
            <Button
              fullWidth
              variant="contained"
              onClick={() => setTrigger((t) => t + 1)}
            >
              Search
            </Button>
          </Grid>
        </Grid>
      )}

      {/* 스케줄 테이블 */}
      <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
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
              <TableRow
                key={`${user.name}-${i}`}
                sx={{ '&:not(:last-child)': { borderBottom: '1px solid #e0e0e0' } }}
              >
                <TableCell>
                  <Typography fontWeight="bold">{user.name}</Typography>
                  <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
                    <Chip label={user.corp} size="small" variant="outlined" sx={{ borderColor: '#1976d2', color: '#1976d2' }} />
                    <Chip label={`EID: ${user.eid}`} size="small" variant="outlined" sx={{ borderColor: '#2e7d32', color: '#2e7d32' }} />
                    <Chip label={user.category} size="small" variant="outlined" sx={{ borderColor: '#ed6c02', color: '#ed6c02' }} />
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
                            <Typography variant="body2" key={idx}>
                              {slot.start}–{slot.end}
                            </Typography>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">OFF</Typography>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
