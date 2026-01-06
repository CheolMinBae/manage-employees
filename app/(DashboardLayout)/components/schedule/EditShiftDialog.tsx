'use client';

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Typography, Box, Chip, IconButton, Alert,
  Switch, FormControlLabel, Select, MenuItem, FormControl, InputLabel, Divider,
  Tabs, Tab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { TimePicker } from '@mui/x-date-pickers';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';

interface TimeSlot {
  _id: string;
  date: string;
  start: string;
  end: string;
  approved?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  userId: string;
  userType: string;
}

interface ExistingSchedule {
  _id: string;
  start: string;
  end: string;
}

interface ScheduleTemplate {
  _id: string;
  name: string;
  displayName: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  order: number;
}

interface UserRole {
  _id: string;
  key: string;
  name: string;
  description?: string;
}

interface WorkSession {
  start: Dayjs | null;
  end: Dayjs | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  slot: TimeSlot | null;
  fetchSchedules: () => void;

  // ✅ 회사별 영업시간 (Page에서 내려줌)
  businessDayStartHour?: number; // ex) 8
  businessDayEndHour?: number;   // ex) 28 (다음날 4시)
}

export default function EditShiftDialog({
  open,
  onClose,
  slot,
  fetchSchedules,
  businessDayStartHour = 8,
  businessDayEndHour = 24,
}: Props) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.position === 'admin';
  const isEmployee = session?.user?.position === 'employee';
  const currentUserType = useMemo(() => (session?.user as any)?.userType || [], [session?.user]);
  const targetUserType = useMemo(() => {
    if (slot?.userType) {
      // slot.userType이 문자열인 경우 배열로 변환
      if (typeof slot.userType === 'string') {
        return slot.userType.split(', ').map(type => type.trim());
      }
      return Array.isArray(slot.userType) ? slot.userType : [slot.userType];
    }
    return [];
  }, [slot?.userType]);
  const currentUserId = (session?.user as any)?.id;

  // =========================
  // ✅ Business Day Helpers
  // =========================
  const startM = businessDayStartHour * 60; // ex) 8*60
  const endM = businessDayEndHour * 60;     // ex) 28*60

  const parseHM = (hm: string) => {
    const [hStr, mStr] = hm.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
  };

  // 영업일 기준 minute으로 변환(새벽은 +1440)
  const toBusinessMinute = (hour: number, minute: number) => {
    let m = hour * 60 + minute;
    if (m < startM) m += 1440;
    return m;
  };

  // 시작시간: end 경계는 포함하면 안됨 (예: 04:00 시작 불가)
  const isAllowedStart = (hour: number, minute: number) => {
    const m = toBusinessMinute(hour, minute);
    return m >= startM && m < endM;
  };

  // 종료시간: end 경계 포함 가능 (예: 04:00 종료 가능)
  const isAllowedEnd = (hour: number, minute: number) => {
    const m = toBusinessMinute(hour, minute);
    return m >= startM && m <= endM;
  };

  // slot.date(영업일의 “날짜”) + HH:mm -> 실제 DateTime (새벽이면 +1일)
  const normalizeToBusinessDateTime = (baseDate: Dayjs, hour: number, minute: number) => {
    let dt = baseDate.startOf('day').hour(hour).minute(minute).second(0).millisecond(0);
    const m = hour * 60 + minute;
    if (m < startM) dt = dt.add(1, 'day');
    return dt;
  };

  const businessHoursLabel = () => {
    const endDisplay = businessDayEndHour > 24 ? businessDayEndHour - 24 : businessDayEndHour;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(businessDayStartHour)}:00 ~ ${pad(endDisplay)}:00`;
  };

  // Check if current user can edit schedules for the target user
  const canEditSchedule = () => {
    if (isAdmin) return true;
    if (currentUserId === slot?.userId) return true;

    // Check if user has manager role for specific user types
    if (Array.isArray(currentUserType)) {
      return currentUserType.some(type =>
        ['manager', 'supervisor', 'team-lead'].includes(type.toLowerCase())
      );
    }
    return false;
  };

  const [editStart, setEditStart] = useState<Dayjs | null>(null);
  const [editEnd, setEditEnd] = useState<Dayjs | null>(null);
  const [existingSchedules, setExistingSchedules] = useState<ExistingSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  // Split Sessions 관련 상태
  const [isSeparated, setIsSeparated] = useState(false);
  const [sessions, setSessions] = useState<WorkSession[]>([
    { start: null, end: null },
    { start: null, end: null }
  ]);

  // UserType 탭 관련 상태
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedUserType, setSelectedUserType] = useState<string>('');
  const [allSchedulesByUserType, setAllSchedulesByUserType] = useState<{ [key: string]: any[] }>({});
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // slot 변경 시 start/end를 “영업일 기준 DateTime”으로 세팅
  useEffect(() => {
    if (slot) {
      const base = dayjs(slot.date);
      const { h: sh, m: sm } = parseHM(slot.start);
      const { h: eh, m: em } = parseHM(slot.end);

      setEditStart(normalizeToBusinessDateTime(base, sh, sm));
      setEditEnd(normalizeToBusinessDateTime(base, eh, em));
      setSelectedUserType(slot.userType);
    }
  }, [slot, businessDayStartHour, businessDayEndHour]);

  // Fetch user roles
  useEffect(() => {
    const fetchUserRoles = async () => {
      try {
        const response = await fetch('/api/userrole');
        if (response.ok) {
          const data = await response.json();

          // Filter roles based on target user's userType (the user being edited)
          const userUserTypes = Array.isArray(targetUserType) ? targetUserType : [];
          const filteredRoles = data.filter((role: UserRole) =>
            userUserTypes.some(userType =>
              role.key.toLowerCase() === userType.toLowerCase()
            )
          );

          setUserRoles(filteredRoles);
        }
      } catch (error) {
        console.error('Error fetching user roles:', error);
      }
    };

    if (open) {
      fetchUserRoles();
    }
  }, [open, targetUserType]);

  // Fetch schedules for all UserTypes
  useEffect(() => {
    const fetchAllUserTypeSchedules = async () => {
      if (!slot?.date || userRoles.length === 0) return;

      setLoadingSchedules(true);
      try {
        const schedulesByType: { [key: string]: any[] } = {};

        // Fetch schedules for each user role
        await Promise.all(
          userRoles.map(async (role) => {
            const response = await fetch(`/api/schedules?userType=${role.name}&date=${slot.date}`);
            if (response.ok) {
              const data = await response.json();
              schedulesByType[role.name] = data;
            } else {
              schedulesByType[role.name] = [];
            }
          })
        );

        setAllSchedulesByUserType(schedulesByType);
      } catch (error) {
        console.error('Error fetching userType schedules:', error);
      } finally {
        setLoadingSchedules(false);
      }
    };

    if (open && slot?.date && userRoles.length > 0) {
      fetchAllUserTypeSchedules();
    }
  }, [open, slot?.date, userRoles]);

  // Fetch existing schedules for the selected date and user
  useEffect(() => {
    const fetchExistingSchedules = async () => {
      if (!slot?.date || !slot?.userId) return;

      try {
        const response = await fetch(`/api/schedules?date=${slot.date}&userId=${slot.userId}`);
        const data = await response.json();

        // Filter out current schedule being edited
        const filtered = data.filter((schedule: any) =>
          schedule._id !== slot._id && schedule.approved
        );

        setExistingSchedules(filtered);
      } catch (error) {
        console.error('Error fetching existing schedules:', error);
      }
    };

    if (open && slot) {
      fetchExistingSchedules();
    }
  }, [open, slot]);

  // Reset split sessions when dialog opens
  useEffect(() => {
    if (open) {
      setIsSeparated(false);
      setSessions([
        { start: null, end: null },
        { start: null, end: null }
      ]);
    }
  }, [open]);

  // =========================
  // ✅ Conflict Logic (영업일 기준으로 비교)
  // =========================
  const normalizedExistingRanges = useMemo(() => {
    if (!slot?.date) return [];
    const base = dayjs(slot.date);

    return existingSchedules.map(s => {
      const { h: sh, m: sm } = parseHM(s.start);
      const { h: eh, m: em } = parseHM(s.end);

      return {
        _id: s._id,
        start: normalizeToBusinessDateTime(base, sh, sm),
        end: normalizeToBusinessDateTime(base, eh, em),
      };
    });
  }, [existingSchedules, slot?.date, businessDayStartHour, businessDayEndHour]);

  const isTimeConflictedNormalized = (time: Dayjs) => {
    return normalizedExistingRanges.some(r =>
      time.isAfter(r.start) && time.isBefore(r.end)
    );
  };

  // shouldDisableTime: “영업시간 밖” + “충돌 시간” 모두 막기
  const makeShouldDisableTime =
    (kind: 'start' | 'end') =>
    (time: Dayjs, view: any) => {
      if (!slot?.date) return false;

      const base = dayjs(slot.date);
      const hour = time.hour();

      if (view === 'hours') {
        // 15분 단위 중 하나라도 “허용 + 비충돌”이면 그 hour는 활성화
        for (let minute = 0; minute < 60; minute += 15) {
          const allowed =
            kind === 'start'
              ? isAllowedStart(hour, minute)
              : isAllowedEnd(hour, minute);

          if (!allowed) continue;

          const dt = normalizeToBusinessDateTime(base, hour, minute);
          if (!isTimeConflictedNormalized(dt)) return false;
        }
        return true;
      }

      // minutes view
      const minute = time.minute();
      const allowed =
        kind === 'start'
          ? isAllowedStart(hour, minute)
          : isAllowedEnd(hour, minute);

      if (!allowed) return true;

      const dt = normalizeToBusinessDateTime(base, hour, minute);
      return isTimeConflictedNormalized(dt);
    };

  // TimePicker onChange에서 “새벽이면 +1일”을 강제 (중요!)
  const handleEditStartChange = (t: Dayjs | null) => {
    if (!slot?.date) {
      setEditStart(t);
      return;
    }
    if (!t) {
      setEditStart(null);
      return;
    }
    const base = dayjs(slot.date);
    setEditStart(normalizeToBusinessDateTime(base, t.hour(), t.minute()));
  };

  const handleEditEndChange = (t: Dayjs | null) => {
    if (!slot?.date) {
      setEditEnd(t);
      return;
    }
    if (!t) {
      setEditEnd(null);
      return;
    }
    const base = dayjs(slot.date);
    setEditEnd(normalizeToBusinessDateTime(base, t.hour(), t.minute()));
  };

  // Check if work duration is 6 hours or more (영업일 기준으로 안전하게)
  const hasMealBreak = () => {
    if (!slot?.date || !editStart || !editEnd) return false;
    const base = dayjs(slot.date);

    const sDT = normalizeToBusinessDateTime(base, editStart.hour(), editStart.minute());
    const eDT = normalizeToBusinessDateTime(base, editEnd.hour(), editEnd.minute());

    const duration = eDT.diff(sDT, 'hour', true);
    return duration >= 6;
  };

  // 🔶 6시간 이상 시 자동 split
  useEffect(() => {
    if (!slot?.date || !editStart || !editEnd) return;
    
    const base = dayjs(slot.date);
    const sDT = normalizeToBusinessDateTime(base, editStart.hour(), editStart.minute());
    const eDT = normalizeToBusinessDateTime(base, editEnd.hour(), editEnd.minute());
    const duration = eDT.diff(sDT, 'hour', true);
    
    // 6시간 이상이고 아직 분리되지 않은 경우 자동 분리
    if (duration >= 6 && !isSeparated) {
      const totalDuration = eDT.diff(sDT, 'minute');
      if (totalDuration <= 0) return;

      const breakStart = sDT.add(totalDuration / 2 - 15, 'minute');
      const breakEnd = breakStart.add(30, 'minute');

      setSessions([
        { start: sDT, end: breakStart },
        { start: breakEnd, end: eDT }
      ]);
      setIsSeparated(true);
    }
  }, [editStart, editEnd, slot?.date]);

  // Handle session separation
  const handleSeparate = () => {
    if (!slot?.date || !editStart || !editEnd) return;

    const base = dayjs(slot.date);
    const sDT = normalizeToBusinessDateTime(base, editStart.hour(), editStart.minute());
    const eDT = normalizeToBusinessDateTime(base, editEnd.hour(), editEnd.minute());

    const totalDuration = eDT.diff(sDT, 'minute');
    if (totalDuration <= 0) return;

    const breakStart = sDT.add(totalDuration / 2 - 15, 'minute');
    const breakEnd = breakStart.add(30, 'minute');

    setSessions([
      { start: sDT, end: breakStart },
      { start: breakEnd, end: eDT }
    ]);
    setIsSeparated(true);
  };

  // Handle session combination
  const handleCombine = () => {
    setIsSeparated(false);
    setSessions([
      { start: editStart, end: null },
      { start: null, end: null }
    ]);
  };

  const handleEditSave = async () => {
    if (!slot || !editStart || !editEnd) return;

    // ✅ 저장 전 영업시간/순서 검증
    const sh = editStart.hour();
    const sm = editStart.minute();
    const eh = editEnd.hour();
    const em = editEnd.minute();

    if (!isAllowedStart(sh, sm)) {
      alert(`Start time must be within business hours. (${businessHoursLabel()})`);
      return;
    }
    if (!isAllowedEnd(eh, em)) {
      alert(`End time must be within business hours. (${businessHoursLabel()})`);
      return;
    }

    const base = dayjs(slot.date);
    const sDT = normalizeToBusinessDateTime(base, sh, sm);
    const eDT = normalizeToBusinessDateTime(base, eh, em);

    if (!eDT.isAfter(sDT)) {
      alert('End time must be after start time.');
      return;
    }

    setLoading(true);
    try {
      if (isSeparated && sessions.length === 2) {
        const firstSession = sessions[0];
        const secondSession = sessions[1];

        // Delete the original schedule
        await fetch(`/api/schedules?id=${slot._id}`, {
          method: 'DELETE',
        });

        // Create two new schedules
        const firstSchedule = {
          userId: slot.userId,
          userType: selectedUserType,
          date: slot.date,
          start: firstSession.start?.format('HH:mm'),
          end: firstSession.end?.format('HH:mm'),
          approved: slot.approved || false
        };

        const secondSchedule = {
          userId: slot.userId,
          userType: selectedUserType,
          date: slot.date,
          start: secondSession.start?.format('HH:mm'),
          end: secondSession.end?.format('HH:mm'),
          approved: slot.approved || false
        };

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
        // Handle single session - update existing schedule
        await fetch('/api/schedules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: slot._id,
            start: editStart.format('HH:mm'),
            end: editEnd.format('HH:mm'),
            userType: selectedUserType,
            approved: slot.approved || false,
          }),
        });
      }

      onClose();
      fetchSchedules();
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Failed to update schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCurrentSchedule = async () => {
    if (!slot) return;

    if (!confirm('Are you sure you want to delete this schedule?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/schedules?id=${slot._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onClose();
        fetchSchedules();
      } else {
        throw new Error('Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExistingSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this existing schedule?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/schedules?id=${scheduleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setExistingSchedules(prev => prev.filter(s => s._id !== scheduleId));
        fetchSchedules();
      } else {
        throw new Error('Failed to delete existing schedule');
      }
    } catch (error) {
      console.error('Error deleting existing schedule:', error);
      alert('Failed to delete existing schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleMakeOff = async () => {
    if (!slot) return;

    if (!confirm(`Are you sure you want to delete ALL schedules for ${slot.date}? This will make the day OFF.`)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/schedules?userId=${slot.userId}&date=${slot.date}&deleteAll=true`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message || 'All schedules deleted successfully');
        onClose();
        fetchSchedules();
      } else {
        throw new Error('Failed to delete all schedules');
      }
    } catch (error) {
      console.error('Error deleting all schedules:', error);
      alert('Failed to delete all schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToPending = async () => {
    if (!slot) return;

    if (!confirm('Are you sure you want to reset this schedule to pending status?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: slot._id,
          approved: false,
        }),
      });

      if (response.ok) {
        alert('Schedule status reset to pending successfully');
        onClose();
        fetchSchedules();
      } else {
        throw new Error('Failed to reset schedule status');
      }
    } catch (error) {
      console.error('Error resetting schedule status:', error);
      alert('Failed to reset schedule status');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!slot) return;

    if (!confirm('Are you sure you want to approve this schedule?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: slot._id,
          approved: true,
        }),
      });

      if (response.ok) {
        alert('Schedule approved successfully');
        onClose();
        fetchSchedules();
      } else {
        throw new Error('Failed to approve schedule');
      }
    } catch (error) {
      console.error('Error approving schedule:', error);
      alert('Failed to approve schedule');
    } finally {
      setLoading(false);
    }
  };

  // Show unauthorized message if user cannot edit schedules
  if (!canEditSchedule()) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Shift</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1">
              You don't have permission to edit this schedule.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Shift</DialogTitle>
      <DialogContent>
        {/* UserType Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={selectedUserType}
            onChange={(e, newValue) => setSelectedUserType(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {userRoles.map((role) => (
              <Tab
                key={role._id}
                label={role.name}
                value={role.key}
              />
            ))}
          </Tabs>
        </Box>

        <Stack spacing={2} mt={1}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Editing schedule for {slot?.date}
          </Alert>

          {/* 승인 정보 표시 */}
          {slot?.approved && (
            <Alert 
              severity="success" 
              sx={{ mb: 2 }}
              icon={<Box sx={{ display: 'flex', alignItems: 'center' }}>✅</Box>}
            >
              <Typography variant="body2">
                Approved by <strong>{slot.approvedBy || 'Unknown'}</strong>
                {slot.approvedAt && (
                  <> on {dayjs(slot.approvedAt).format('MMM D, YYYY h:mm A')}</>
                )}
              </Typography>
            </Alert>
          )}

          {/* Always show manual edit UI */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Work Time
            </Typography>
            <Stack direction="row" spacing={2}>
              <TimePicker
                label="Start Time"
                value={editStart}
                onChange={handleEditStartChange}
                shouldDisableTime={makeShouldDisableTime('start')}
                disabled={loading}
                sx={{ flex: 1 }}
              />
              <TimePicker
                label="End Time"
                value={editEnd}
                onChange={handleEditEndChange}
                shouldDisableTime={makeShouldDisableTime('end')}
                disabled={loading}
                sx={{ flex: 1 }}
              />
            </Stack>
          </Box>

          {hasMealBreak() && (
            <Box>
              <Button
                variant={isSeparated ? "outlined" : "contained"}
                onClick={isSeparated ? handleCombine : handleSeparate}
                fullWidth
                disabled={loading}
              >
                {isSeparated ? "Combine Sessions" : "Split Sessions"}
              </Button>
            </Box>
          )}

          {isSeparated && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  First Session
                </Typography>
                <Stack direction="row" spacing={2}>
                  <TimePicker
                    label="Start"
                    value={sessions[0].start}
                    disabled
                    sx={{ flex: 1 }}
                  />
                  <TimePicker
                    label="End"
                    value={sessions[0].end}
                    disabled
                    sx={{ flex: 1 }}
                  />
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Second Session
                </Typography>
                <Stack direction="row" spacing={2}>
                  <TimePicker
                    label="Start"
                    value={sessions[1].start}
                    disabled
                    sx={{ flex: 1 }}
                  />
                  <TimePicker
                    label="End"
                    value={sessions[1].end}
                    disabled
                    sx={{ flex: 1 }}
                  />
                </Stack>
              </Box>
            </>
          )}

          {existingSchedules.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Other schedules on this day:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {existingSchedules.map((schedule) => (
                  <Chip
                    key={schedule._id}
                    label={`${schedule.start}-${schedule.end}`}
                    variant="outlined"
                    size="small"
                    deleteIcon={<DeleteIcon />}
                    onDelete={() => handleDeleteExistingSchedule(schedule._id)}
                    disabled={loading}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* UserType별 스케줄 표시 */}
          {loadingSchedules ? (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Loading schedules...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 3 }}>
              {userRoles.map((role) => {
                const schedules = allSchedulesByUserType[role.name] || [];
                return (
                  <Box key={role.key} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {role.name} Schedules
                      {slot?.date && ` - ${slot.date}`}
                    </Typography>

                    {schedules.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {schedules.map((schedule: any, index: number) => (
                          <Box
                            key={schedule._id || index}
                            sx={{
                              p: 1,
                              bgcolor: schedule.approved ? 'success.light' : 'warning.light',
                              color: '#000',
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Typography variant="caption">
                              {schedule.start}-{schedule.end}
                              {schedule.approved ? ' ✓' : ' ⏳'}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No schedules found for this user type.
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Stack direction="row" spacing={1} width="100%" justifyContent="space-between">
          <Box>
            <Button
              onClick={handleMakeOff}
              color="error"
              variant="outlined"
              disabled={loading}
            >
              Make OFF
            </Button>
          </Box>
          <Box display="flex" gap={1}>
            {isAdmin && !slot?.approved && (
              <Button
                onClick={handleApprove}
                color="success"
                variant="contained"
                disabled={loading}
              >
                Approve
              </Button>
            )}
            {slot?.approved && (
              <Button
                onClick={handleResetToPending}
                color="warning"
                variant="outlined"
                disabled={loading}
              >
                Reset to Pending
              </Button>
            )}
            <Button
              onClick={handleDeleteCurrentSchedule}
              color="error"
              disabled={loading}
            >
              Delete
            </Button>
            <Button onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleEditSave}
              disabled={loading}
            >
              Save
            </Button>
          </Box>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
