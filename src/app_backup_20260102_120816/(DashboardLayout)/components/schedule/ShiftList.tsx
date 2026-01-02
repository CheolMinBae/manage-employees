// components/ShiftList.tsx
'use client';

import {
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { format, isWithinInterval, parseISO } from 'date-fns';
import dayjs from 'dayjs';

function getDurationColor(hours: number) {
  if (hours <= 3) return '#1976d2'; // 파랑
  if (hours <= 5) return '#2e7d32'; // 초록
  if (hours <= 5.5) return '#ed6c02'; // 주황
  return '#d32f2f'; // 빨강
}

export default function ShiftList({
  weeks,
  scheduleList,
  openEditDialog,
  handleDelete,
  onCopyWeek,
}: {
  weeks: { start: Date; end: Date }[];
  scheduleList: any[];
  openEditDialog: (slot: any) => void;
  handleDelete: (id: string) => void;
  onCopyWeek: (week: { start: Date; end: Date }) => void;
}) {
  return (
    <Stack spacing={3}>
      {weeks.map((week, wIdx) => {
        const weekTitle = `${format(week.start, 'MMM d')} – ${format(week.end, 'MMM d')}`;

        const weekShifts = scheduleList
          .filter(s =>
            isWithinInterval(parseISO(s.date), {
              start: week.start,
              end: week.end,
            })
          )
          .sort((a, b) => a.date.localeCompare(b.date));

        return (
          <Box key={wIdx}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography fontWeight="bold" variant="subtitle1">
                {weekTitle}
              </Typography>
              <IconButton onClick={() => onCopyWeek(week)} size="small">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>

            {weekShifts.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No shifts
              </Typography>
            ) : (
              <Stack spacing={1}>
                {weekShifts.map((slot, idx) => {
                  const start = dayjs(`${slot.date}T${slot.start}`);
                  const end = dayjs(`${slot.date}T${slot.end}`);
                  const hours = end.diff(start, 'minute') / 60;
                  const color = getDurationColor(hours);
                  const weekday = dayjs(slot.date).format('ddd');

                  return (
                    <Box
                      key={idx}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      p={1}
                      border={`2px solid ${color}`}
                      borderRadius={1}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {dayjs(slot.date).format('MMM D')} ({weekday}) {slot.start} ~ {slot.end} ({hours}hr)
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={slot.approved ? 'Approved' : 'Pending'}
                          size="small"
                          color={slot.approved ? 'success' : 'warning'}
                        />
                        <IconButton size="small" onClick={() => openEditDialog(slot)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(slot._id)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}

            {wIdx !== weeks.length - 1 && <Divider sx={{ mt: 2 }} />}
          </Box>
        );
      })}
    </Stack>
  );
}
