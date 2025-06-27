// src/app/api/schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import Schedule from '@models/Schedule';
import SignupUser from '@models/SignupUser';
import {
  startOfWeek,
  endOfWeek,
  format,
  parseISO,
  isWithinInterval,
} from 'date-fns';
import { WEEK_OPTIONS } from '@/constants/dateConfig';

export const dynamic = 'force-dynamic';

// 시간 중복 검사 함수
function isTimeOverlapping(start1: string, end1: string, start2: string, end2: string): boolean {
  const [start1Hour, start1Min] = start1.split(':').map(Number);
  const [end1Hour, end1Min] = end1.split(':').map(Number);
  const [start2Hour, start2Min] = start2.split(':').map(Number);
  const [end2Hour, end2Min] = end2.split(':').map(Number);

  const start1Minutes = start1Hour * 60 + start1Min;
  const end1Minutes = end1Hour * 60 + end1Min;
  const start2Minutes = start2Hour * 60 + start2Min;
  const end2Minutes = end2Hour * 60 + end2Min;

  // 두 시간대가 겹치는지 확인
  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
}

// 중복 스케줄 검사 함수
async function checkScheduleConflict(userId: string, date: string, start: string, end: string, excludeId?: string) {
  const existingSchedules = await Schedule.find({
    userId,
    date,
    ...(excludeId && { _id: { $ne: excludeId } }) // 수정 시 현재 스케줄 제외
  });

  for (const schedule of existingSchedules) {
    if (isTimeOverlapping(start, end, schedule.start, schedule.end)) {
      return {
        conflict: true,
        conflictingSchedule: {
          id: schedule._id,
          start: schedule.start,
          end: schedule.end
        }
      };
    }
  }

  return { conflict: false, conflictingSchedule: null };
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode');
    const start = searchParams.get('weekStart');
    const filterType = searchParams.get('type');
    const filterKeyword = searchParams.get('keyword')?.toLowerCase();
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const userType = searchParams.get('userType');

    // If userId, date, or userType are provided, return filtered schedules
    if (userId || date || userType) {
      const filter: any = {};
      if (userId) filter.userId = userId;
      if (date) filter.date = date;
      if (userType) filter.userType = userType;

      const schedules = await Schedule.find(filter).lean();
      
      // If userType is specified, we need to populate user data
      if (userType && schedules.length > 0) {
        const userIds = Array.from(new Set(schedules.map((s: any) => s.userId.toString())));
        const users = await SignupUser.find({ _id: { $in: userIds } })
          .select('_id name corp eid category position userType')
          .lean();

        const userMap = new Map();
        users.forEach(user => {
          userMap.set((user._id as any).toString(), {
            name: user.name,
            corp: user.corp,
            eid: user.eid,
            category: user.category,
            position: user.userType && user.userType.length > 0 ? user.userType[0] : 'Barista',
          });
        });

        const schedulesWithUserData = schedules.map((s: any) => {
          const user = userMap.get(s.userId.toString());
          return {
            ...s,
            name: user?.name || 'Unknown',
            corp: user?.corp || 'Unknown',
            eid: user?.eid || 'Unknown',
            category: user?.category || 'Unknown',
            position: user?.position || 'Barista',
          };
        });

        return NextResponse.json(schedulesWithUserData);
      }

      return NextResponse.json(schedules);
    }

    const schedules = await Schedule.find().select('+createdAt').lean();

    const userIds = Array.from(new Set(schedules.map((s: any) => s.userId.toString())));
    const users = await SignupUser.find({ _id: { $in: userIds } })
      .select('_id name corp eid category position userType')
      .lean();

    const userMap = new Map();
    users.forEach(user => {
      userMap.set((user._id as any).toString(), {
        name: user.name,
        corp: user.corp,
        eid: user.eid,
        category: user.category,
        position: user.userType && user.userType.length > 0 ? user.userType[0] : 'Barista',
      });
    });

    const withUserData = schedules.map((s: any) => {
      const user = userMap.get(s.userId.toString());
      return {
        ...s,
        userId: s.userId,
        name: user?.name || 'Unknown',
        corp: user?.corp || 'Unknown',
        eid: user?.eid || 'Unknown',
        category: user?.category || 'Unknown',
        position: user?.position || 'Barista',
      };
    });

    if (mode === 'dashboard') {
      const today = start ? parseISO(start) : new Date();
      const weekStart = startOfWeek(today, WEEK_OPTIONS);
      const weekEnd = endOfWeek(today, WEEK_OPTIONS);

      const filteredWithUserData = withUserData.filter((s) => {
        if (!filterType || !filterKeyword) return true;
        const value = s[filterType as keyof typeof s];
        return value?.toString().toLowerCase().includes(filterKeyword);
      });

      const filtered = filteredWithUserData.filter((s) =>
        isWithinInterval(parseISO(s.date), { start: weekStart, end: weekEnd })
      );

      const scheduleMap: Record<string, any> = {};
      filtered.forEach((s) => {
        const status =
          s.approved === true
            ? 'approved'
            : new Date(s.createdAt) >= new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            ? 'pending'
            : 'pending';

        if (!scheduleMap[s.userId]) {
          scheduleMap[s.userId] = {
            userId: s.userId,
            name: s.name,
            position: s.position,
            corp: s.corp,
            eid: s.eid,
            category: s.category,
            shifts: [],
          };
        }

        const existing = scheduleMap[s.userId].shifts.find(
          (shift: any) => shift.date === s.date
        );

        const slotData = {
          _id: s._id,
          start: s.start,
          end: s.end,
          status,
        };

        if (existing) {
          existing.slots.push(slotData);
        } else {
          scheduleMap[s.userId].shifts.push({
            date: s.date,
            slots: [slotData],
          });
        }
      });

      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        weekDates.push(format(d, 'yyyy-MM-dd'));
      }

      const weekTitle = `Week of ${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`;
      const weekRange = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`;

      return NextResponse.json({
        weekTitle,
        weekRange,
        dates: weekDates,
        scheduleData: Object.values(scheduleMap),
      });
    }

    return NextResponse.json(withUserData);
  } catch (error: any) {
    console.error('Error in GET /api/schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();
    
    // 필수 필드 검증
    if (!data.userId || !data.date || !data.start || !data.end) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, date, start, end' },
        { status: 400 }
      );
    }

    // 시간 중복 검사
    const conflictCheck = await checkScheduleConflict(
      data.userId,
      data.date,
      data.start,
      data.end
    );

    if (conflictCheck.conflict) {
      return NextResponse.json(
        { 
          error: 'Schedule conflict detected',
          message: `Time ${data.start}-${data.end} overlaps with existing schedule ${conflictCheck.conflictingSchedule!.start}-${conflictCheck.conflictingSchedule!.end}`,
          conflictingSchedule: conflictCheck.conflictingSchedule
        },
        { status: 400 }
      );
    }

    const newSchedule = await Schedule.create(data);
    return NextResponse.json(newSchedule);
  } catch (error: any) {
    console.error('Error in POST /api/schedules:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();
    const { id, ...updates } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing schedule ID' },
        { status: 400 }
      );
    }

    // 기존 스케줄 조회
    const existingSchedule = await Schedule.findById(id);
    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // 시간이 변경되는 경우에만 중복 검사
    if (updates.start || updates.end) {
      const newStart = updates.start || existingSchedule.start;
      const newEnd = updates.end || existingSchedule.end;

      const conflictCheck = await checkScheduleConflict(
        existingSchedule.userId.toString(),
        existingSchedule.date,
        newStart,
        newEnd,
        id // 현재 스케줄은 검사에서 제외
      );

      if (conflictCheck.conflict) {
        return NextResponse.json(
          { 
            error: 'Schedule conflict detected',
            message: `Time ${newStart}-${newEnd} overlaps with existing schedule ${conflictCheck.conflictingSchedule!.start}-${conflictCheck.conflictingSchedule!.end}`,
            conflictingSchedule: conflictCheck.conflictingSchedule
          },
          { status: 400 }
        );
      }
    }

    const updated = await Schedule.findByIdAndUpdate(id, updates, { new: true });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error in PUT /api/schedules:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const deleteAll = searchParams.get('deleteAll'); // 'true'이면 해당 날짜의 모든 스케줄 삭제
    
    if (deleteAll === 'true' && userId && date) {
      // 특정 사용자의 특정 날짜 모든 스케줄 삭제
      const deleted = await Schedule.deleteMany({ userId, date });
      return NextResponse.json({ 
        success: true, 
        deletedCount: deleted.deletedCount,
        message: `Deleted ${deleted.deletedCount} schedules for ${date}` 
      });
    }
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    
    // 단일 스케줄 삭제
    const deleted = await Schedule.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/schedules:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule', message: error.message },
      { status: 500 }
    );
  }
}
