// 2025.12.18-code updated. 
// 2025.12.18-code updated.
'use client';

import {
  Box, Grid, Typography, IconButton, Dialog, DialogTitle,
  DialogActions, DialogContent, Button, CircularProgress
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import dayjs, { Dayjs } from 'dayjs';
import '@/constants/dateConfig'; // dayjs 플러그인 초기화
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

import AddShiftDialog from '@/app/(DashboardLayout)/components/schedule/AddShiftDialog';
import EditShiftDialog from '@/app/(DashboardLayout)/components/schedule/EditShiftDialog';
import ShiftList from '@/app/(DashboardLayout)/components/schedule/ShiftList';

/* =========================
   Interfaces
========================= */
interface TimeSlot {
  _id: string;
  start: string;
  end: string;
  approved?: boolean;
  date: string;
  userId: string;
  userType: string;
}

interface WeekRange {
  start: Date;
  end: Date;
}

interface CorporationSettings {
  _id: string;
  name: string;
  businessDayStartHour: number;
  businessDayEndHour: number;
}

/* =========================
   Page
========================= */
export default function ScheduleRegisterPage() {
  const { data: session } = useSession();

  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [scheduleList, setScheduleList] = useState<TimeSlot[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyTargetWeek, setCopyTargetWeek] = useState<WeekRange | null>(null);
  const [shiftsForSelectedDate, setShiftsForSelectedDate] = useState<TimeSlot[]>([]);

  // ✅ 회사 설정
  const [corporation, setCorporation] = useState<CorporationSettings | null>(null);

  const userId = session?.user?.id as string;
  const corporationId = (session?.user as any)?.corporationId as string;

  /* =========================
     회사 설정 가져오기
     ========================= */
  useEffect(() => {
    if (!corporationId) return;

    fetch('/api/corporation')
      .then(res => res.json())
      .then((list: CorporationSettings[]) => {
        const corp = list.find(c => c._id === corporationId);
        if (corp) setCorporation(corp);
      })
      .catch(err => console.error('Failed to load corporation settings', err));
  }, [corporationId]);

  /* =========================
     Month / Week Logic
     ========================= */
  const handleMonthChange = (dir: 'prev' | 'next') => {
    const current = dayjs(currentMonth);
    const newMonth = dir === 'prev' ? current.subtract(1, 'month') : current.add(1, 'month');
    if (dir === 'next' && newMonth.isAfter(dayjs())) return;
    setCurrentMonth(newMonth.toDate());
  };

  const getWeeksInMonth = (monthStart: Date): WeekRange[] => {
    const weeks: WeekRange[] = [];
    let start = dayjs(monthStart).startOf('month').startOf('week');
    const monthEnd = dayjs(monthStart).endOf('month');

    while (start.isBefore(monthEnd) || start.isSame(monthEnd, 'day')) {
      const end = start.endOf('week');
      weeks.push({ start: start.toDate(), end: end.toDate() });
      start = start.add(7, 'day');
    }
    return weeks;
  };

  /* =========================
     Date / Dialog Handling
     ========================= */
  const handleDateChange = (date: Dayjs | null) => {
    if (!date) return;
    setSelectedDate(date);
    setOpenDialog(true);

    const dateStr = date.format('YYYY-MM-DD');
    const shifts = scheduleList.filter((s) => s.date === dateStr && s.userId === userId);
    setShiftsForSelectedDate(shifts);
  };

  const openEditDialog = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    await fetch(`/api/schedules?id=${id}`, { method: 'DELETE' });
    fetchSchedules();
  };

  /* =========================
     Fetch Schedules
     ========================= */
  const fetchSchedules = async () => {
    if (!userId) return;
    setScheduleLoading(true);
    try {
      const res = await fetch('/api/schedules');
      if (!res.ok) return;

      const text = await res.text();
      if (!text) {
        setScheduleList([]);
        return;
      }

      const data: TimeSlot[] = JSON.parse(text);
      setScheduleList(data.filter((s) => s.userId === userId));
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setScheduleList([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [userId]);

  /* =========================
     Copy Week Logic
     ========================= */
  const weeks = getWeeksInMonth(currentMonth);

  const handleCopyWeek = (week: WeekRange) => {
    setCopyTargetWeek(week);
    setCopyDialogOpen(true);
  };

  const confirmCopyWeek = async () => {
    if (!copyTargetWeek || !userId) return;

    const today = dayjs();
    const targetWeekStart = today.startOf('week');

    const sourceWeek = scheduleList.filter((s) => {
      const d = dayjs(s.date);
      return d.startOf('week').isSame(dayjs(copyTargetWeek.start), 'day');
    });

    const existing = scheduleList.filter((s) =>
      dayjs(s.date).startOf('week').isSame(targetWeekStart, 'day')
    );

    const newItems = sourceWeek
      .map((s) => {
        const d = dayjs(s.date);
        const diff = d.day(); // 0=Sun, 1=Mon, ...
        const newDate = targetWeekStart.add(diff, 'day');
        return {
          userId,
          userType: s.userType || 'Barista',
          date: newDate.format('YYYY-MM-DD'),
          start: s.start,
          end: s.end,
        };
      })
      .filter((item) => {
        return !existing.some(
          (e) =>
            e.date === item.date &&
            ((e.start <= item.start && item.start < e.end) ||
              (e.start < item.end && item.end <= e.end))
        );
      });

    await Promise.all(
      newItems.map((item) =>
        fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        })
      )
    );

    setCopyDialogOpen(false);
    setCopyTargetWeek(null);
    fetchSchedules();
  };

  /* =========================
     Calendar Rendering
     ========================= */
  const renderDay = (props: PickersDayProps) => {
    const isScheduled = scheduleList.some(s => s.date === props.day.format('YYYY-MM-DD'));
    return (
      <PickersDay
        {...props}
        sx={{
          backgroundColor: isScheduled ? '#1976d2' : undefined,
          color: isScheduled ? '#fff' : undefined,
          borderRadius: '50%',
          '&:hover': {
            backgroundColor: isScheduled ? '#1565c0' : undefined,
          },
        }}
      />
    );
  };

  /* =========================
     Render
     ========================= */
  if (scheduleLoading && scheduleList.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh" gap={2}>
        <CircularProgress size={48} />
        <Typography variant="body2" color="text.secondary">Loading schedules...</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box p={4}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5">📌 My Shifts</Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton onClick={() => handleMonthChange('prev')}>
                  <ArrowBackIosNewIcon fontSize="small" />
                </IconButton>
                <Typography variant="body1" fontWeight="bold">
                  {dayjs(currentMonth).format('MMMM')}
                </Typography>
                <IconButton onClick={() => handleMonthChange('next')}>
                  <ArrowForwardIosIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <ShiftList
              weeks={weeks}
              scheduleList={scheduleList}
              openEditDialog={openEditDialog}
              handleDelete={handleDelete}
              onCopyWeek={handleCopyWeek}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h5" mb={2}>🗓 Select a Date to Add Schedule</Typography>
            <DateCalendar
              value={selectedDate}
              onChange={handleDateChange}
              slots={{ day: renderDay }}
            />
          </Grid>
        </Grid>

        <AddShiftDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          selectedDate={selectedDate}
          userId={userId}
          fetchSchedules={fetchSchedules}
          existingShifts={shiftsForSelectedDate}
          // ✅ 회사 설정 전달
          businessDayStartHour={corporation?.businessDayStartHour}
          businessDayEndHour={corporation?.businessDayEndHour}
        />

        <EditShiftDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          slot={editingSlot}
          fetchSchedules={fetchSchedules}
          // ✅ 회사 설정 전달
          businessDayStartHour={corporation?.businessDayStartHour}
          businessDayEndHour={corporation?.businessDayEndHour}
        />

        <Dialog open={copyDialogOpen} onClose={() => setCopyDialogOpen(false)}>
          <DialogTitle>Copy this week's schedule?</DialogTitle>
          <DialogContent>
            <Typography>
              This will copy all shifts from the selected week to the current week, skipping overlapping entries.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCopyDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={confirmCopyWeek}>Submit</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
