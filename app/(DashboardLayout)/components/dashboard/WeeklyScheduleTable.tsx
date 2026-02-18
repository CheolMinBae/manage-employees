'use client';

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Paper, Box, Chip, Stack, IconButton, Button, TableSortLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress, Snackbar,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { useSession } from 'next-auth/react';
import { useMemo, useState, useRef } from 'react';
import dayjs from 'dayjs';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ApprovalDialog from '../approve/ApprovalDialog';
import EditShiftDialog from '../schedule/EditShiftDialog';
import AddShiftDialog from '../schedule/AddShiftDialog';
import SimpleAddShiftDialog from '../schedule/SimpleAddShiftDialog';
import { useWeeklyScheduleFilter } from '../../hooks/useWeeklyScheduleFilter';
import { useWeeklyScheduleActions } from '../../hooks/useWeeklyScheduleActions';
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

interface WeeklyScheduleTableProps {
  weekRange: string;
  dates: string[];
  scheduleData: UserSchedule[];
  weekStart: Date;
  onWeekChange: (dir: 'prev' | 'next') => void;
  onRefresh?: () => void;
}

/* =========================
   시간 계산 유틸
========================= */

const diffMinutes = (start: string, end: string) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let duration = (eh * 60 + em) - (sh * 60 + sm);
  if (duration < 0) duration += 24 * 60;
  return duration;
};

const formatHoursNumber = (hours: number) => {
  if (hours === 0) return '0.00';
  const isHalf = Math.abs(hours * 2 - Math.round(hours * 2)) < 1e-9;
  const isInt = Math.abs(hours - Math.round(hours)) < 1e-9;
  if (isInt || isHalf) return hours.toFixed(1);
  return hours.toFixed(2);
};

const calculateWeeklyHoursByStatus = (user: UserSchedule, status: 'approved' | 'pending') => {
  let totalMinutes = 0;
  user.shifts.forEach(d =>
    d.slots.forEach(s => {
      if (s.status !== status) return;
      totalMinutes += diffMinutes(s.start, s.end);
    })
  );
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const formatDateHeader = (dateStr: string) => {
  return dayjs(dateStr).format('ddd MMM D');
};

const getShiftsForDate = (shifts: DailyShift[], date: string): ShiftSlot[] => {
  const entry = shifts.find(s => s.date === date);
  const slots = entry?.slots ?? [];
  return slots.sort((a, b) => parseInt(a.start.replace(':', '')) - parseInt(b.start.replace(':', '')));
};

const getColorByStatus = (status: ShiftSlot['status']) =>
  status === 'approved' ? '#2e7d32' : status === 'pending' ? '#f9a825' : status === 'rejected' ? '#c62828' : '#000';

/* =========================
   컴포넌트
========================= */

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

  // 엑셀 업로드 상태
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    setUploadFile(null);
    setUploadResult(null);
    setUploadDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await fetch('/api/schedules/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadResult(data);
        if (data.success > 0 || data.updated > 0) {
          setToastMessage(`${data.success}건 등록, ${data.updated}건 업데이트 완료`);
          setToastSeverity('success');
          setToastOpen(true);
          onRefresh?.();
        }
      } else {
        setUploadResult({ error: data.error || 'Upload failed' });
      }
    } catch (error) {
      setUploadResult({ error: 'Network error' });
    } finally {
      setUploading(false);
    }
  };

  const sortedDates = useMemo(
    () => [...dates].sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf()),
    [dates]
  );

  const filteredScheduleData = useMemo(() => {
    if (isAdmin) return scheduleData;
    return scheduleData.filter(u => u.name === userName);
  }, [scheduleData, isAdmin, userName]);

  const filterProps = useWeeklyScheduleFilter({
    scheduleData: filteredScheduleData,
    userPosition,
    userName,
  });

  // 스케줄 액션 hook
  const actions = useWeeklyScheduleActions({
    scheduleData,
    userPosition: userPosition ?? undefined,
    userName: userName ?? undefined,
    isAdmin,
    onRefresh,
  });

  // 요일별 합계
  const dayTotals = useMemo(() => {
    const totals: Record<string, { pending: number; approved: number }> = {};
    sortedDates.forEach(d => (totals[d] = { pending: 0, approved: 0 }));

    filterProps.filteredData.forEach(user => {
      user.shifts.forEach(day => {
        if (!totals[day.date]) return;
        day.slots.forEach((slot: ShiftSlot) => {
          const mins = diffMinutes(slot.start, slot.end);
          if (slot.status === 'pending') totals[day.date].pending += mins;
          if (slot.status === 'approved') totals[day.date].approved += mins;
        });
      });
    });

    Object.keys(totals).forEach(date => {
      totals[date] = { pending: totals[date].pending / 60, approved: totals[date].approved / 60 };
    });
    return totals;
  }, [filterProps.filteredData, sortedDates]);

  // 주간 총계
  const weeklyTotals = useMemo(() => {
    let pending = 0;
    let approved = 0;
    sortedDates.forEach(d => {
      pending += dayTotals[d]?.pending ?? 0;
      approved += dayTotals[d]?.approved ?? 0;
    });
    return { pending, approved };
  }, [dayTotals, sortedDates]);

  // Excel 다운로드
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

  // 날짜 헤더 클릭 → Hourly 뷰 이동
  const goHourlyWithDate = (date: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'hourly');
    params.set('date', date);
    router.push(`${pathname}?${params.toString()}`);
    setTimeout(() => {
      document.getElementById('hourly-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Button variant="contained" color="success" size="small" disabled={!actions.isPublishable || actions.publishing} onClick={actions.handlePublish} sx={{ minWidth: 90 }}>
            {actions.publishing ? 'Publishing...' : 'Publish'}
          </Button>
          <Button variant="outlined" color="primary" size="small" onClick={handleDownloadExcel} startIcon={<FileDownloadIcon />} sx={{ minWidth: 90 }}>
            Excel
          </Button>
          {isAdmin && (
            <Button variant="outlined" color="secondary" size="small" onClick={handleUploadClick} startIcon={<FileUploadIcon />} sx={{ minWidth: 90 }}>
              Upload
            </Button>
          )}
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
          selectedCategories={filterProps.selectedCategories}
          uniqueNames={filterProps.uniqueNames}
          uniquePositions={filterProps.uniquePositions}
          uniqueCategories={filterProps.uniqueCategories}
          onFilterTypeChange={filterProps.handleFilterTypeChange}
          onKeywordChange={filterProps.setKeyword}
          onSelectedNamesChange={filterProps.setSelectedNames}
          onSelectedPositionsChange={filterProps.setSelectedPositions}
          onSelectedCategoriesChange={filterProps.setSelectedCategories}
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
            {/* 요일별 합계 행 */}
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
              <TableCell align="center">
                <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                  {formatHoursNumber(weeklyTotals.approved)}
                </Typography>
              </TableCell>
            </TableRow>

            {/* 직원 데이터 행 */}
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
                                  '&:hover': isClickable ? { backgroundColor: 'rgba(0, 0, 0, 0.04)', borderRadius: 1 } : {},
                                }}
                                onClick={() => actions.handleSlotClick(slot, user, date)}
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
                            '&:hover': (isAdmin || (userPosition === 'employee' && user.name === userName)) ? { backgroundColor: 'rgba(0, 0, 0, 0.04)', borderRadius: 1 } : {},
                          }}
                          onClick={() => actions.handleOffClick(user, date)}
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

      {/* 다이얼로그들 */}
      <ApprovalDialog
        open={actions.approvalOpen}
        onClose={() => actions.setApprovalOpen(false)}
        startTime={actions.startTime}
        endTime={actions.endTime}
        setStartTime={actions.setStartTime}
        setEndTime={actions.setEndTime}
        onApprove={actions.handleApprove}
        onDelete={actions.handleDelete}
        selectedDate={actions.selectedShiftInfo?.date}
        userId={actions.selectedShiftInfo?.userId}
        currentScheduleId={actions.selectedShiftInfo?._id}
      />

      {userPosition === 'admin' ? (
        <AddShiftDialog
          open={actions.addScheduleOpen}
          onClose={actions.closeAddDialog}
          selectedDate={actions.selectedDateInfo?.date ? dayjs(actions.selectedDateInfo.date) : null}
          userId={actions.selectedDateInfo?.userId || ''}
          existingShifts={actions.selectedDateInfo ? actions.getExistingShiftsForUser(actions.selectedDateInfo.userId) : []}
          fetchSchedules={() => onRefresh?.()}
        />
      ) : (
        <ApprovalDialog
          open={actions.addScheduleOpen}
          onClose={actions.closeAddDialog}
          startTime={actions.startTime}
          endTime={actions.endTime}
          setStartTime={actions.setStartTime}
          setEndTime={actions.setEndTime}
          onApprove={actions.handleAddSchedule}
          selectedDate={actions.selectedDateInfo?.date}
          userId={actions.selectedDateInfo?.userId}
        />
      )}

      {actions.selectedShiftInfo && (
        <EditShiftDialog
          open={actions.editModalOpen}
          onClose={() => actions.setEditModalOpen(false)}
          slot={actions.selectedShiftInfo}
          fetchSchedules={() => onRefresh?.()}
        />
      )}

      <SimpleAddShiftDialog
        open={actions.simpleAddOpen}
        onClose={actions.closeSimpleAddDialog}
        selectedDate={actions.selectedDateInfo?.date ? dayjs(actions.selectedDateInfo.date) : null}
        userId={actions.selectedDateInfo?.userId || ''}
        userName={actions.selectedDateInfo?.userName || ''}
        userInfo={actions.selectedDateInfo?.userInfo}
        fetchSchedules={() => onRefresh?.()}
      />

      {/* 엑셀 업로드 Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>스케줄 엑셀 업로드</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>엑셀 형식:</strong> corp, eid, date(YYYY-MM-DD), start(HH:mm), end(HH:mm) 컬럼 필요
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Corp/EID는 대소문자 구분 없이 매칭됩니다. 동일 시간대 중복 시 업데이트됩니다.
              </Typography>
            </Alert>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <Button
              variant="outlined"
              fullWidth
              onClick={() => fileInputRef.current?.click()}
              sx={{ py: 2, mb: 2, border: '2px dashed', borderColor: 'primary.main' }}
            >
              {uploadFile ? `📄 ${uploadFile.name}` : '📁 파일 선택 (.xlsx, .xls, .csv)'}
            </Button>

            {uploadResult && !uploadResult.error && (
              <Box sx={{ mt: 2 }}>
                <Alert severity={uploadResult.failed > 0 ? 'warning' : 'success'} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    총 {uploadResult.totalRows}건 처리: {uploadResult.success}건 등록, {uploadResult.updated}건 업데이트, {uploadResult.failed}건 실패
                  </Typography>
                </Alert>
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <Box sx={{ maxHeight: 200, overflow: 'auto', bgcolor: '#fff3e0', p: 1, borderRadius: 1 }}>
                    {uploadResult.errors.map((err: string, i: number) => (
                      <Typography key={i} variant="caption" display="block" color="error">
                        {err}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {uploadResult?.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {uploadResult.error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Close</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!uploadFile || uploading}
            startIcon={uploading ? <CircularProgress size={16} /> : <FileUploadIcon />}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={4000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setToastOpen(false)} severity={toastSeverity}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
