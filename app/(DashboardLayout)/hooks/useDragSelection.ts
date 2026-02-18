'use client';

import { useState, useCallback, useRef } from 'react';

interface DragStart {
  userId: string;
  hour: number;
  name: string;
}

interface DragEnd {
  hour: number;
}

interface DragSelection {
  userId: string;
  startHour: number;
  endHour: number;
  name: string;
}

/**
 * HourlyStaffingTable의 드래그로 시간 범위를 선택하는 로직
 */
export function useDragSelection(onDragComplete: (userId: string, name: string, startHour: number, endHour: number) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);

  // ref로 관리하여 콜백 안정성 확보
  const dragStartRef = useRef<DragStart | null>(null);
  const dragEndRef = useRef<DragEnd | null>(null);
  const onDragCompleteRef = useRef(onDragComplete);
  onDragCompleteRef.current = onDragComplete;

  const handleDragStart = useCallback((userId: string, hour: number, name: string) => {
    setIsDragging(true);
    dragStartRef.current = { userId, hour, name };
    dragEndRef.current = { hour };
  }, []);

  const handleDragEnter = useCallback((hour: number) => {
    if (dragStartRef.current) {
      dragEndRef.current = { hour };
    }
  }, []);

  const resetDrag = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
    dragEndRef.current = null;
  }, []);

  const handleDragEndAction = useCallback(() => {
    const ds = dragStartRef.current;
    const de = dragEndRef.current;
    if (!ds || !de) {
      resetDrag();
      return;
    }

    const startHour = Math.min(ds.hour, de.hour);
    const endHour = Math.max(ds.hour, de.hour);

    setDragSelection({
      userId: ds.userId,
      startHour,
      endHour: endHour + 1,
      name: ds.name,
    });

    onDragCompleteRef.current(ds.userId, ds.name, startHour, endHour);
    resetDrag();
  }, [resetDrag]);

  const isDragSelected = useCallback((userId: string, hour: number) => {
    const ds = dragStartRef.current;
    const de = dragEndRef.current;
    if (!ds || !de) return false;
    if (ds.userId !== userId) return false;
    const minHour = Math.min(ds.hour, de.hour);
    const maxHour = Math.max(ds.hour, de.hour);
    return hour >= minHour && hour <= maxHour;
  }, []);

  return {
    isDragging,
    dragSelection,
    handleDragStart,
    handleDragEnter,
    handleDragEndAction,
    isDragSelected,
  };
}
