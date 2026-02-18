'use client';

import { useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';

interface WorkSession {
  start: Dayjs | null;
  end: Dayjs | null;
}

interface ShiftSlot {
  _id: string;
  start: string;
  end: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface UserSchedule {
  userId: string;
  name: string;
  position: string | string[];
  corp: string;
  eid: number | string;
  category: string;
  shifts: { date: string; slots: ShiftSlot[] }[];
}

interface SelectedShiftInfo {
  _id: string;
  userId: string;
  date: string;
  start: string;
  end: string;
  approved?: boolean;
  userType: string;
}

interface SelectedDateInfo {
  userId: string;
  date: string;
  userName: string;
  userInfo?: { _id: string; name: string; userType: string; position: string };
}

interface UseWeeklyScheduleActionsParams {
  scheduleData: UserSchedule[];
  userPosition?: string;
  userName?: string;
  isAdmin: boolean;
  onRefresh?: () => void;
}

/**
 * WeeklyScheduleTable의 스케줄 CRUD 액션과 다이얼로그 상태를 관리하는 hook
 */
export function useWeeklyScheduleActions({
  scheduleData,
  userPosition,
  userName,
  isAdmin,
  onRefresh,
}: UseWeeklyScheduleActionsParams) {
  // 다이얼로그 상태
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addScheduleOpen, setAddScheduleOpen] = useState(false);
  const [simpleAddOpen, setSimpleAddOpen] = useState(false);
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [selectedShiftInfo, setSelectedShiftInfo] = useState<SelectedShiftInfo | null>(null);
  const [selectedDateInfo, setSelectedDateInfo] = useState<SelectedDateInfo | null>(null);

  // Publish 상태
  const [isPublishable, setIsPublishable] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 모든 slot이 approved인지 체크
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

  // 슬롯 클릭 핸들러
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

  // OFF 셀 클릭 핸들러
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

  // 스케줄 추가 (employee ApprovalDialog에서 호출)
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
      closeAddDialog();
      onRefresh?.();
    } catch (e: any) {
      console.error(e);
      alert(`Error creating schedule: ${e?.message || e}`);
    }
  };

  // 승인 핸들러
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
          approved: true,
        });
        const del = await fetch(`/api/schedules?id=${selectedShiftInfo._id}`, { method: 'DELETE' });
        if (!del.ok) throw new Error(`Delete failed: ${del.status}`);
        const [r1, r2] = await Promise.all([
          fetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(makeBody(s1)) }),
          fetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(makeBody(s2)) }),
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

  // 삭제 핸들러
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

  // Publish 핸들러
  const handlePublish = async () => {
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      alert('Published!');
    }, 1000);
  };

  // 사용자별 기존 시프트 조회
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

  // 다이얼로그 닫기 헬퍼
  const closeAddDialog = () => {
    setAddScheduleOpen(false);
    setSelectedDateInfo(null);
    setStartTime(null);
    setEndTime(null);
  };

  const closeSimpleAddDialog = () => {
    setSimpleAddOpen(false);
    setSelectedDateInfo(null);
  };

  return {
    // 다이얼로그 상태
    approvalOpen,
    setApprovalOpen,
    editModalOpen,
    setEditModalOpen,
    addScheduleOpen,
    setAddScheduleOpen,
    simpleAddOpen,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    selectedShiftInfo,
    selectedDateInfo,

    // Publish
    isPublishable,
    publishing,
    handlePublish,

    // 액션 핸들러
    handleSlotClick,
    handleOffClick,
    handleAddSchedule,
    handleApprove,
    handleDelete,
    getExistingShiftsForUser,

    // 다이얼로그 닫기
    closeAddDialog,
    closeSimpleAddDialog,
  };
}
