'use client';

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Paper, Box, Chip, Stack, IconButton, Button, TableSortLabel
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useSession } from 'next-auth/react';
import { useMemo, useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { format, parseISO } from 'date-fns';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ApprovalDialog from '../approve/ApprovalDialog';
import EditShiftDialog from '../schedule/EditShiftDialog';
import AddShiftDialog from '../schedule/AddShiftDialog';
import SimpleAddShiftDialog from '../schedule/SimpleAddShiftDialog';
import { useWeeklyScheduleFilter } from '../../hooks/useWeeklyScheduleFilter';
import Filter from './weeklyschedule/Filter';

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
  position: string | string[];
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
  onRefresh?: () => void;
}

export default function WeeklyScheduleTable({
  weekRange,
  dates,
  scheduleData,
  weekStart,
  onWeekChange,
  onRefresh,
}: WeeklyScheduleTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: session } = useSession();
  const userPosition = session?.user?.position;
  const userName = session?.user?.name;
  const isAdmin = userPosition === 'admin';

  // 날짜 배열 정렬
  const sortedDates = useMemo(
    () => [...dates].sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime()),
    [dates]
  );

  // admin이 아니면 본인만
  const filteredScheduleData = useMemo(() => {
    if (isAdmin) return scheduleData;
    return scheduleData.filter(u => u.name === userName);
  }, [scheduleData, isAdmin, userName]);

  const filterProps = useWeeklyScheduleFilter({
    scheduleData: filteredScheduleData,
    userPosition,
    userName
  });

  const [approvalOpen, setApprovalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addScheduleOpen, setAddScheduleOpen] = useState(false);
  const [simpleAddOpen, setSimpleAddOpen] = useState(false);
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [selectedShiftInfo, setSelectedShiftInfo] = useState<{
    _id: string;
    userId: string;
    date: string;
    start: string;
    end: string;
    approved?: boolean;
    userType: string;
  } | null>(null);
  const [selectedDateInfo, setSelectedDateInfo] = useState<{
    userId: string;
    date: string;
    userName: string;
    userInfo?: { _id: string; name: string; userType: string; position: string; };
  } | null>(null);

  const [isPublishable, setIsPublishable] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 모든 slot이 approved인지
  useEffect(() => {
    if (!scheduleData || scheduleData.length === 0) {
      setIsPublishable(false);
      return;
    }
    const allApproved = scheduleData.every(u =>
      u.shifts.every(d => d.slots.every(s => s.status === 'approved'))
    );
    setIsPublishable(allApproved);
  }, [scheduleData]);

  const handlePublish = async () => {
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      alert('Published!');
    }, 1000);
  };

  const handleDownloadExcel = async () => {
    try {
      const weekStartFormatted = dayjs(weekStart).format('YYYY-MM-DD');
      const visibleUserIds = filterProps.filteredData.map(u => u.userId);
      const params = new URLSearchParams({
        weekStart: weekStartFormatted,
        userIds: JSON.stringify(visibleUserIds),
      });
      const res = await fetch(`/api/schedules/download?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to download excel file');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-schedule-${weekStartFormatted}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to download excel file');
    }
  };

  const formatDateHeader = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${format(date, 'EEE')} ${format(date, 'MMM d')}`;
  };

  const getShiftsForDate = (shifts: DailyShift[], date: string): ShiftSlot[] => {
    const entry = shifts.find(s => s.date === date);
    const slots = entry?.slots ?? [];
    return slots.sort((a, b) => parseInt(a.start.replace(':', '')) - parseInt(b.start.replace(':', '')));
  };

  const getColorByStatus = (status: ShiftSlot['status']) =>
    status === 'approved' ? '#2e7d32' : status === 'pending' ? '#f9a825' : status === 'rejected' ? '#c62828' : '#000';

  // 주차 합계(개인)
  const calculateWeeklyHoursByStatus = (user: UserSchedule, status: 'approved' | 'pending') => {
    let totalMinutes = 0;
    user.shifts.forEach(d =>
      d.slots.forEach(s => {
        if (s.status !== status) return;
        const [sh, sm] = s.start.split(':').map(Number);
        const [eh, em] = s.end.split(':').map(Number);
        let duration = (eh * 60 + em) - (sh * 60 + sm);
        if (duration < 0) duration += 24 * 60;
        totalMinutes += duration;
      })
    );
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };

  // 분 계산 유틸
  const diffMinutes = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let duration = (eh * 60 + em) - (sh * 60 + sm);
    if (duration < 0) duration += 24 * 60; // 자정 넘어가는 경우
    return duration;
  };

  // - 0 => '0.00'
  // - .5 단위면 소수1자리(예: 5.5)
  // - 15/45분 포함은 소수2자리(예: 3.75)
  const formatHoursNumber = (hours: number) => {
    if (hours === 0) return '0.00';
    const isHalf = Math.abs(hours * 2 - Math.round(hours * 2)) < 1e-9;
    const isInt = Math.abs(hours - Math.round(hours)) < 1e-9;
    if (isInt || isHalf) return hours.toFixed(1);
    return hours.toFixed(2);
  };

  // ✅ 요일별 Pending/Approved 총합 (현재 보이는 직원만)
  const dayTotals = useMemo(() => {
    const totals: Record<string, { pending: number; approved: number }> = {};
    sortedDates.forEach(d => (totals[d] = { pending: 0, approved: 0 }));

    filterProps.filteredData.forEach(user => {
      user.shifts.forEach(day => {
        if (!totals[day.date]) return; // 주차 범위 밖이면 무시
        day.slots.forEach((slot: ShiftSlot) => {
          const mins = diffMinutes(slot.start, slot.end);
          if (slot.status === 'pending') totals[day.date].pending += mins;
          if (slot.status === 'approved') totals[day.date].approved += mins;
        });
      });
    });

    // 분 → 시간(소수)
    Object.keys(totals).forEach(date => {
      totals[date] = {
        pending: totals[date].pending / 60,
        approved: totals[date].approved / 60,
      };
    });
    return totals;
  }, [filterProps.filteredData, sortedDates]);

  // ✅ 주간 총계(오른쪽 Weekly 칼럼에 표시)
  const weeklyTotals = useMemo(() => {
    let pending = 0;
    let approved = 0;
    sortedDates.forEach(d => {
      pending += dayTotals[d]?.pending ?? 0;
      approved += dayTotals[d]?.approved ?? 0;
    });
    return { pending, approved };
  }, [dayTotals, sortedDates]);

  const handleSlotClick = (slot: ShiftSlot, user: UserSchedule, date: string) => {
    if (!isAdmin && user.name !== userName) return;
    setStartTime(dayjs(`${date}T${slot.start}`));
    setEndTime(dayjs(`${date}T${slot.end}`));
    setSelectedShiftInfo({
      _id: slot._id,
      userId: user.userId,
      date,
      start: slot.start,
      end: slot.end,
      approved: slot.status === 'approved',
      userType: 'Barista',
    });
    if (slot.status === 'pending') {
      userPosition === 'admin' ? setApprovalOpen(true) : setEditModalOpen(true);
    } else {
      setEditModalOpen(true);
    }
  };

  const handleOffClick = (user: UserSchedule, date: string) => {
    if (!isAdmin && user.name !== userName) return;
    const userInfo = {
      _id: user.userId,
      name: user.name,
      userType: Array.isArray(user.position) ? user.position[0] : (user.position || 'Employee'),
      position: Array.isArray(user.position) ? user.position.join(', ') : (user.position || 'Employee'),
    };
    setSelectedDateInfo({ userId: user.userId, date, userName: user.name, userInfo });
    setStartTime(null);
    setEndTime(null);
    setSimpleAddOpen(true);
  };

  const handleAddSchedule = async () => {
    if (!selectedDateInfo || !startTime || !endTime) return;
    try {
      const newSchedule = {
        userId: selectedDateInfo.userId,
        userType: 'Barista',
        date: selectedDateInfo.date,
        start: startTime.format('HH:mm'),
        end: endTime.format('HH:mm'),
        approved: userPosition === 'admin',
      };
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchedule),
      });
      if (!res.ok) throw new Error(await res.text());
      setAddScheduleOpen(false);
      setSelectedDateInfo(null);
      setStartTime(null);
      setEndTime(null);
      onRefresh?.();
    } catch (e: any) {
      console.error(e);
      alert(`Error creating schedule: ${e?.message || e}`);
    }
  };

  const handleApprove = async (sessions?: WorkSession[]) => {
    if (!selectedShiftInfo) return;
    try {
      if (sessions && sessions.length > 1) {
        const [s1, s2] = sessions;
        const makeBody = (s: WorkSession) => ({
          userId: selectedShiftInfo.userId,
          userType: selectedShiftInfo.userType,
          date: selectedShiftInfo.date,
          start: s.start?.format('HH:mm'),
          end: s.end?.format('HH:mm'),
          approved: true
        });
        const del = await fetch(`/api/schedules?id=${selectedShiftInfo._id}`, { method: 'DELETE' });
        if (!del.ok) throw new Error(`Delete failed: ${del.status}`);
        const [r1, r2] = await Promise.all([
          fetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(makeBody(s1)) }),
          fetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(makeBody(s2)) })
        ]);
        if (!r1.ok || !r2.ok) throw new Error(`Create failed: ${r1.status}, ${r2.status}`);
      } else {
        const res = await fetch('/api/schedules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedShiftInfo._id, approved: true, userType: selectedShiftInfo.userType }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      setApprovalOpen(false);
      onRefresh?.();
    } catch (e: any) {
      console.error(e);
      alert(`Error approving schedule: ${e?.message || e}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedShiftInfo) return;
    try {
      const res = await fetch(`/api/schedules?id=${selectedShiftInfo._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete schedule');
      setApprovalOpen(false);
      setSelectedShiftInfo(null);
      onRefresh?.();
    } catch (e) {
      console.error(e);
      alert('Failed to delete schedule');
    }
  };

  const getExistingShiftsForUser = (userId: string) => {
    const user = scheduleData.find(u => u.userId === userId);
    if (!user) return [];
    const existing: { date: string; start: string; end: string; userId: string }[] = [];
    user.shifts.forEach(d =>
      d.slots.forEach(s => {
        if (s.status === 'approved') existing.push({ date: d.date, start: s.start, end: s.end, userId });
      })
    );
    return existing;
  };

  // ✅ 날짜 헤더 클릭 → 현재 경로 쿼리를 view=hourly&date=YYYY-MM-DD 로 변경
  const goHourlyWithDate = (date: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'hourly');
    params.set('date', date);
    router.push(`${pathname}?${params.toString()}`);
    // (선택) Hourly 섹션으로 스크롤
    setTimeout(() => {
      document.getElementById('hourly-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Button variant="contained" color="success" size="small" disabled={!isPublishable || publishing} onClick={handlePublish} sx={{ minWidth: 90 }}>
            {publishing ? 'Publishing...' : 'Publish'}
          </Button>
          <Button variant="outlined" color="primary" size="small" onClick={handleDownloadExcel} startIcon={<FileDownloadIcon />} sx={{ minWidth: 90 }}>
            Excel
          </Button>
          <Typography variant="h5">🗓️ Weekly Schedule</Typography>
        </Box>
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
        <Filter
          filterType={filterProps.filterType}
          keyword={filterProps.keyword}
          selectedNames={filterProps.selectedNames}
          selectedPositions={filterProps.selectedPositions}
          uniqueNames={filterProps.uniqueNames}
          uniquePositions={filterProps.uniquePositions}
          onFilterTypeChange={filterProps.handleFilterTypeChange}
          onKeywordChange={filterProps.setKeyword}
          onSelectedNamesChange={filterProps.setSelectedNames}
          onSelectedPositionsChange={filterProps.setSelectedPositions}
          onSearch={filterProps.handleSearch}
          onClear={filterProps.handleClear}
          onKeywordKeyDown={filterProps.handleKeywordKeyDown}
        />
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ width: '50px' }}><strong>No.</strong></TableCell>
              <TableCell>
                <TableSortLabel
                  active={filterProps.sortField === 'name'}
                  direction={filterProps.sortField === 'name' ? filterProps.sortDirection : 'asc'}
                  onClick={() => filterProps.handleSort('name')}
                >
                  <strong>Name</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={filterProps.sortField === 'position'}
                  direction={filterProps.sortField === 'position' ? filterProps.sortDirection : 'asc'}
                  onClick={() => filterProps.handleSort('position')}
                >
                  <strong>Position</strong>
                </TableSortLabel>
              </TableCell>
              {sortedDates.map((date) => (
                <TableCell
                  key={date}
                  align="center"
                  onClick={() => goHourlyWithDate(date)}
                  sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }}
                  title={`Open Hourly Staffing for ${formatDateHeader(date)}`}
                >
                  <strong>{formatDateHeader(date)}</strong>
                </TableCell>
              ))}
              <TableCell align="center"><strong>Weekly Total</strong></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {/* 🔶 요일과 직원 스케줄 사이에 표시되는 합계 줄들 */}
            <TableRow>
              <TableCell />
              <TableCell sx={{ pt: 1, fontWeight: 700, color: 'text.secondary' }}>PENDING</TableCell>
              <TableCell />
              {sortedDates.map(date => (
                <TableCell key={`pending-${date}`} align="center">
                  <Typography variant="body2" sx={{ color: '#f9a825', fontWeight: 700 }}>
                    {formatHoursNumber(dayTotals[date]?.pending ?? 0)}
                  </Typography>
                </TableCell>
              ))}
              {/* ✅ 주간 총계 (오른쪽 Weekly 칼럼) */}
              <TableCell align="center">
                <Typography variant="body2" sx={{ color: '#f9a825', fontWeight: 700 }}>
                  {formatHoursNumber(weeklyTotals.pending)}
                </Typography>
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell />
              <TableCell sx={{ pb: 1, fontWeight: 700, color: 'text.secondary' }}>APPROVED</TableCell>
              <TableCell />
              {sortedDates.map(date => (
                <TableCell key={`approved-${date}`} align="center">
                  <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                    {formatHoursNumber(dayTotals[date]?.approved ?? 0)}
                  </Typography>
                </TableCell>
              ))}
              {/* ✅ 주간 총계 (오른쪽 Weekly 칼럼) */}
              <TableCell align="center">
                <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                  {formatHoursNumber(weeklyTotals.approved)}
                </Typography>
              </TableCell>
            </TableRow>
            {/* 🔶 여기까지 합계 줄 */}

            {filterProps.filteredData.map((user, i) => (
              <TableRow key={`${user.name}-${i}`}>
                <TableCell align="center">
                  <Typography variant="body2" color="text.secondary">{i + 1}</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">{user.name}</Typography>
                  <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
                    <Chip label={user.corp} size="small" variant="outlined" />
                    <Chip label={`EID: ${user.eid}`} size="small" variant="outlined" />
                    <Chip label={user.category} size="small" variant="outlined" />
                  </Stack>
                </TableCell>
                <TableCell>
                  {Array.isArray(user.position) ? user.position.join(', ') : String(user.position || 'Employee')}
                </TableCell>

                {sortedDates.map((date) => {
                  const shifts = getShiftsForDate(user.shifts, date);
                  return (
                    <TableCell key={date} align="center">
                      {shifts.length > 0 ? (
                        <Box display="flex" flexDirection="column" gap={0.5}>
                          {shifts.map((slot, idx) => {
                            const canEdit = isAdmin || (userPosition === 'employee' && user.name === userName);
                            const isClickable = canEdit && (slot.status === 'pending' || slot.status === 'approved');
                            return (
                              <Typography
                                key={idx}
                                variant="body2"
                                sx={{
                                  color: getColorByStatus(slot.status),
                                  cursor: isClickable ? 'pointer' : 'default',
                                  '&:hover': isClickable ? { backgroundColor: 'rgba(0, 0, 0, 0.04)', borderRadius: 1 } : {}
                                }}
                                onClick={() => handleSlotClick(slot, user, date)}
                              >
                                {slot.start}–{slot.end}
                              </Typography>
                            );
                          })}
                        </Box>
                      ) : (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            cursor: (isAdmin || (userPosition === 'employee' && user.name === userName)) ? 'pointer' : 'default',
                            '&:hover': (isAdmin || (userPosition === 'employee' && user.name === userName)) ? { backgroundColor: 'rgba(0, 0, 0, 0.04)', borderRadius: 1 } : {}
                          }}
                          onClick={() => handleOffClick(user, date)}
                        >
                          OFF
                        </Typography>
                      )}
                    </TableCell>
                  );
                })}

                <TableCell align="center">
                  <Box display="flex" flexDirection="column" gap={0.5}>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: '#2e7d32', fontSize: '0.75rem' }}>
                      {calculateWeeklyHoursByStatus(user, 'approved')}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: '#f9a825', fontSize: '0.75rem' }}>
                      {calculateWeeklyHoursByStatus(user, 'pending')}
                    </Typography>
                  </Box>
                </TableCell>
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
        onDelete={handleDelete}
        selectedDate={selectedShiftInfo?.date}
        userId={selectedShiftInfo?.userId}
        currentScheduleId={selectedShiftInfo?._id}
      />

      {userPosition === 'admin' ? (
        <AddShiftDialog
          open={addScheduleOpen}
          onClose={() => {
            setAddScheduleOpen(false);
            setSelectedDateInfo(null);
            setStartTime(null);
            setEndTime(null);
          }}
          selectedDate={selectedDateInfo?.date ? dayjs(selectedDateInfo.date) : null}
          userId={selectedDateInfo?.userId || ''}
          existingShifts={selectedDateInfo ? getExistingShiftsForUser(selectedDateInfo.userId) : []}
          fetchSchedules={() => onRefresh?.()}
        />
      ) : (
        <ApprovalDialog
          open={addScheduleOpen}
          onClose={() => {
            setAddScheduleOpen(false);
            setSelectedDateInfo(null);
            setStartTime(null);
            setEndTime(null);
          }}
          startTime={startTime}
          endTime={endTime}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          onApprove={handleAddSchedule}
          selectedDate={selectedDateInfo?.date}
          userId={selectedDateInfo?.userId}
        />
      )}

      {selectedShiftInfo && (
        <EditShiftDialog
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          slot={selectedShiftInfo}
          fetchSchedules={() => onRefresh?.()}
        />
      )}

      <SimpleAddShiftDialog
        open={simpleAddOpen}
        onClose={() => {
          setSimpleAddOpen(false);
          setSelectedDateInfo(null);
        }}
        selectedDate={selectedDateInfo?.date ? dayjs(selectedDateInfo.date) : null}
        userId={selectedDateInfo?.userId || ''}
        userName={selectedDateInfo?.userName || ''}
        userInfo={selectedDateInfo?.userInfo}
        fetchSchedules={() => onRefresh?.()}
      />
    </Box>
  );
}
