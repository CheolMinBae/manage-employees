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
import ApprovalDialog from '@/app/(DashboardLayout)/components/approve/ApprovalDialog';
import EditShiftDialog from '@/app/(DashboardLayout)/components/schedule/EditShiftDialog';
import AddShiftDialog from '@/app/(DashboardLayout)/components/schedule/AddShiftDialog';
import SimpleAddShiftDialog from '@/app/(DashboardLayout)/components/schedule/SimpleAddShiftDialog';
import { useWeeklyScheduleFilter } from '@/app/(DashboardLayout)/hooks/useWeeklyScheduleFilter';
import Filter from '@/app/(DashboardLayout)/components/dashboard/weeklyschedule/Filter';

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
  const { data: session } = useSession();
  const userPosition = session?.user?.position;
  const userName = session?.user?.name;
  const isAdmin = userPosition === 'admin';

  // 날짜 배열을 일요일부터 토요일 순서로 정렬
  const sortedDates = useMemo(() => {
    if (!dates || !Array.isArray(dates)) return [];
    return [...dates].sort((a, b) => {
      const dateA = parseISO(a);
      const dateB = parseISO(b);
      return dateA.getTime() - dateB.getTime();
    });
  }, [dates]);

  // admin이 아닌 경우 자신의 스케줄만 필터링
  const filteredScheduleData = useMemo(() => {
    if (isAdmin) {
      return scheduleData;
    }
    // admin이 아닌 경우 자신의 스케줄만 표시
    return scheduleData.filter(user => user.name === userName);
  }, [scheduleData, isAdmin, userName]);

  // 필터링 기능을 custom hook으로 분리
  const filterProps = useWeeklyScheduleFilter({
    scheduleData: filteredScheduleData, // 필터링된 데이터 사용
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
    userInfo?: {
      _id: string;
      name: string;
      userType: string;
      position: string;
    };
  } | null>(null);

  // publish 상태
  const [isPublishable, setIsPublishable] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 모든 스케줄 approved 여부 체크 (API 연동 전 임시 로직)
  useEffect(() => {
    if (!scheduleData || scheduleData.length === 0) {
      setIsPublishable(false);
      return;
    }
    // 모든 slot이 approved인지 확인
    const allApproved = scheduleData.every(user =>
      user.shifts.every(day =>
        day.slots.every(slot => slot.status === 'approved')
      )
    );
    setIsPublishable(allApproved);
  }, [scheduleData]);

  const handlePublish = async () => {
    setPublishing(true);
    // TODO: API 연동
    setTimeout(() => {
      setPublishing(false);
      alert('Published!');
    }, 1000);
  };

  const handleDownloadExcel = async () => {
    try {
      const weekStartFormatted = dayjs(weekStart).format('YYYY-MM-DD');

      const response = await fetch(`/api/schedules/download?weekStart=${weekStartFormatted}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to download excel file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-schedule-${weekStartFormatted}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading excel:', error);
      alert('Failed to download excel file');
    }
  };



  const formatDateHeader = (dateStr: string) => {
    // 서버에서 전달하는 date 문자열(YYYY-MM-DD)을 직접 파싱하여 시간대 변환 방지
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // 로컬 시간으로 직접 생성
    const weekday = format(date, 'EEE'); // Sun, Mon, Tue, etc.
    const monthDay = format(date, 'MMM d'); // Jan 1, Feb 2, etc.
    const result = `${weekday} ${monthDay}`;
    
    // 디버깅용 로그 (첫 번째 날짜만)
    if (dateStr === sortedDates[0]) {
      console.log('Date formatting debug:', {
        input: dateStr,
        parsed: date,
        weekday,
        monthDay,
        result,
        dayOfWeek: date.getDay(), // 0=Sunday, 1=Monday, etc.
        allDates: sortedDates,
        weekStart: weekStart
      });
    }
    
    return result;
  };

  const getShiftsForDate = (shifts: DailyShift[], date: string): ShiftSlot[] => {
    const entry = shifts.find((s) => s.date === date);
    const slots = entry?.slots ?? [];
    
    // 시간순으로 정렬 (start 시간 기준 오름차순)
    return slots.sort((a, b) => {
      const timeA = a.start.replace(':', '');
      const timeB = b.start.replace(':', '');
      return parseInt(timeA) - parseInt(timeB);
    });
  };

  const getColorByStatus = (status: ShiftSlot['status']) => {
    switch (status) {
      case 'approved': return '#2e7d32';
      case 'pending': return '#f9a825';
      case 'rejected': return '#c62828';
      default: return '#000';
    }
  };

  // 주간 총 근무 시간 계산 함수 (승인 상태별로 계산)
  const calculateWeeklyHoursByStatus = (user: UserSchedule, status: 'approved' | 'pending'): string => {
    let totalMinutes = 0;

    user.shifts.forEach(dailyShift => {
      dailyShift.slots.forEach(slot => {
        if (slot.status === status) {
          const startTime = slot.start.split(':');
          const endTime = slot.end.split(':');
          
          const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
          const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
          
          // 시간이 다음날로 넘어가는 경우 처리 (예: 23:00 - 01:00)
          let duration = endMinutes - startMinutes;
          if (duration < 0) {
            duration += 24 * 60; // 24시간 추가
          }
          
          totalMinutes += duration;
        }
      });
    });

    // 분을 시간으로 변환
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0 && minutes === 0) {
      return '0h';
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  const handleSlotClick = (slot: ShiftSlot, user: UserSchedule, date: string) => {
    // Admin can edit any schedule, Employee can only edit their own
    if (!isAdmin && user.name !== userName) {
      return;
    }

    setStartTime(dayjs(`${date}T${slot.start}`));
    setEndTime(dayjs(`${date}T${slot.end}`));
    setSelectedShiftInfo({
      _id: slot._id,
      userId: user.userId,
      date,
      start: slot.start,
      end: slot.end,
      approved: slot.status === 'approved',
      userType: Array.isArray(user.position) ? user.position[0] : (user.position || 'Barista'),
    });

    if (slot.status === 'pending') {
      if (userPosition === 'admin') {
        setApprovalOpen(true);
      } else if (userPosition === 'employee') {
        setEditModalOpen(true);
      }
    } else if (slot.status === 'approved') {
      // Both admin and employee can edit approved schedules
      setEditModalOpen(true);
    }
  };

  const handleOffClick = (user: UserSchedule, date: string) => {
    // Employee can only add their own schedule
    if (!isAdmin && user.name !== userName) {
      return;
    }
    
    // 사용자 정보를 SimpleAddShiftDialog 형식으로 변환
    // position을 userType으로 변환 (기본값 'Barista' 보장)
    const userTypeValue = Array.isArray(user.position) 
      ? (user.position[0] || 'Barista') 
      : (user.position || 'Barista');
    
    const userInfo = {
      _id: user.userId,
      name: user.name,
      userType: userTypeValue,
      position: Array.isArray(user.position) ? user.position.join(', ') : (user.position || 'Barista'),
    };
    
    setSelectedDateInfo({
      userId: user.userId,
      date,
      userName: user.name,
      userInfo, // 사용자 정보 추가
    });
    setStartTime(null);
    setEndTime(null);
    
    // Use SimpleAddShiftDialog for OFF clicks
    setSimpleAddOpen(true);
  };

  const handleAddSchedule = async () => {
    if (!selectedDateInfo || !startTime || !endTime) return;

    try {
      // 해당 사용자의 position 찾기
      const targetUser = scheduleData.find(u => u.userId === selectedDateInfo.userId);
      const userType = targetUser 
        ? (Array.isArray(targetUser.position) ? targetUser.position[0] : (targetUser.position || 'Barista'))
        : 'Barista';
      
      const newSchedule = {
        userId: selectedDateInfo.userId,
        userType: userType,
        date: selectedDateInfo.date,
        start: startTime.format('HH:mm'),
        end: endTime.format('HH:mm'),
        approved: userPosition === 'admin' ? true : false, // Admin이 추가하면 자동 승인
      };

      console.log('Creating new schedule:', newSchedule);
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchedule),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Create failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      setAddScheduleOpen(false);
      setSelectedDateInfo(null);
      setStartTime(null);
      setEndTime(null);
      
      // 데이터 새로고침
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred.';
      alert(`Error creating schedule: ${errorMessage}`);
    }
  };

  const handleApprove = async (sessions?: WorkSession[]) => {
    if (!selectedShiftInfo) return;

    try {
      if (sessions && sessions.length > 1) {
        // Handle separated sessions
        const firstSession = sessions[0];
        const secondSession = sessions[1];

        // Create two separate schedule entries
        const firstSchedule = {
          userId: selectedShiftInfo.userId,
          userType: selectedShiftInfo.userType,
          date: selectedShiftInfo.date,
          start: firstSession.start?.format('HH:mm'),
          end: firstSession.end?.format('HH:mm'),
          approved: true
        };

        const secondSchedule = {
          userId: selectedShiftInfo.userId,
          userType: selectedShiftInfo.userType,
          date: selectedShiftInfo.date,
          start: secondSession.start?.format('HH:mm'),
          end: secondSession.end?.format('HH:mm'),
          approved: true
        };

        console.log('Deleting original schedule:', selectedShiftInfo._id);
        // Delete the original schedule
        const deleteResponse = await fetch(`/api/schedules?id=${selectedShiftInfo._id}`, {
          method: 'DELETE',
        });
        
        if (!deleteResponse.ok) {
          throw new Error(`Delete failed: ${deleteResponse.status}`);
        }

        console.log('Creating new schedules:', { firstSchedule, secondSchedule });
        // Create two new schedules
        const [firstResponse, secondResponse] = await Promise.all([
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

        if (!firstResponse.ok || !secondResponse.ok) {
          throw new Error(`Create failed: ${firstResponse.status}, ${secondResponse.status}`);
        }
      } else {
        // Handle single session
        console.log('Updating schedule:', { id: selectedShiftInfo._id, approved: true });
        const response = await fetch('/api/schedules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedShiftInfo._id,
            approved: true,
            userType: selectedShiftInfo.userType,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Update failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Update result:', result);
      }

      setApprovalOpen(false);
      
      // 데이터 새로고침
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error approving schedule:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred.';
      alert(`Error approving schedule: ${errorMessage}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedShiftInfo) return;

    try {
      const response = await fetch(`/api/schedules?id=${selectedShiftInfo._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      setApprovalOpen(false);
      setSelectedShiftInfo(null);
      
      // 데이터 새로고침
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  // AddShiftDialog에 전달할 기존 스케줄 데이터 생성
  const getExistingShiftsForUser = (userId: string) => {
    const user = scheduleData.find(u => u.userId === userId);
    if (!user) return [];
    
    const existingShifts: { date: string; start: string; end: string; userId: string }[] = [];
    user.shifts.forEach(dailyShift => {
      dailyShift.slots.forEach(slot => {
        if (slot.status === 'approved') {
          existingShifts.push({
            date: dailyShift.date,
            start: slot.start,
            end: slot.end,
            userId: userId
          });
        }
      });
    });
    
    return existingShifts;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          {/* Publish 버튼 */}
          <Button
            variant="contained"
            color="success"
            size="small"
            disabled={!isPublishable || publishing}
            onClick={handlePublish}
            sx={{ minWidth: 90 }}
          >
            {publishing ? 'Publishing...' : 'Publish'}
          </Button>
          {/* 엑셀 다운로드 버튼 추가 */}
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={handleDownloadExcel}
            startIcon={<FileDownloadIcon />}
            sx={{ minWidth: 90 }}
          >
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
                <TableCell key={date} align="center">
                  <strong>{formatDateHeader(date)}</strong>
                </TableCell>
              ))}
              <TableCell align="center"><strong>Weekly Total</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
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
                  {Array.isArray(user.position) 
                    ? user.position.join(', ') 
                    : String(user.position || 'Employee')}
                </TableCell>
                {sortedDates.map((date) => {
                  const shifts = getShiftsForDate(user.shifts, date);
                  return (
                    <TableCell key={date} align="center">
                      {shifts.length > 0 ? (
                        <Box display="flex" flexDirection="column" gap={0.5}>
                          {shifts.map((slot, idx) => {
                            const canEdit = userPosition === 'admin' || (userPosition === 'employee' && user.name === userName);
                            const isClickable = canEdit && (slot.status === 'pending' || slot.status === 'approved');
                            
                            return (
                              <Typography
                                key={idx}
                                variant="body2"
                                sx={{ 
                                  color: getColorByStatus(slot.status), 
                                  cursor: isClickable ? 'pointer' : 'default',
                                  '&:hover': isClickable ? {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                    borderRadius: 1,
                                  } : {}
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
                            cursor: (userPosition === 'admin' || (userPosition === 'employee' && user.name === userName)) ? 'pointer' : 'default',
                            '&:hover': (userPosition === 'admin' || (userPosition === 'employee' && user.name === userName)) ? {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              borderRadius: 1,
                            } : {}
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
                    {/* 승인된 스케줄 시간 */}
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      sx={{ 
                        color: '#2e7d32', // approved 색상
                        fontSize: '0.75rem'
                      }}
                    >
                      {calculateWeeklyHoursByStatus(user, 'approved')}
                    </Typography>
                    {/* 미승인 스케줄 시간 */}
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      sx={{ 
                        color: '#f9a825', // pending 색상
                        fontSize: '0.75rem'
                      }}
                    >
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

      {/* Admin uses AddShiftDialog, Employee uses ApprovalDialog */}
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

      {/* Simple Add Shift Dialog for OFF clicks */}
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