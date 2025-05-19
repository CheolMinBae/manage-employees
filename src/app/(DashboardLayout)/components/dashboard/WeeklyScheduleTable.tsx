'use client';

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Paper, Box, Chip, Stack
} from '@mui/material';

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
  weekTitle: string;
  weekRange: string;
  dates: string[];
  scheduleData: UserSchedule[];
}

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

export default function WeeklyScheduleTable({
  weekTitle,
  weekRange,
  dates,
  scheduleData,
}: WeeklyScheduleTableProps) {
  return (
    <Box>
      <Typography variant="h5" mb={2}>
        🗓️ {weekTitle} ({weekRange})
      </Typography>

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
            {scheduleData.map((user, i) => (
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
