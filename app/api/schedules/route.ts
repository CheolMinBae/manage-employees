// src/app/api/schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import Schedule from '@models/Schedule';
import SignupUser from '@models/SignupUser';
import Corporation from '@models/Corporation';
import {
  startOfWeek,
  endOfWeek,
  format,
  parseISO,
  isWithinInterval,
} from 'date-fns';
import { WEEK_OPTIONS } from '@/constants/dateConfig';

export const dynamic = 'force-dynamic';

/* =========================
   Business Day Helpers
========================= */

type BusinessWindow = {
  startHour: number; // 0~23
  endHour: number;   // 1~48 (cross-midnight이면 24초과 권장)
  startM: number;
  endM: number;
};

function isObjectIdLike(v: string) {
  return /^[0-9a-fA-F]{24}$/.test(v);
}

function normalizeBusinessWindow(startHourRaw: number, endHourRaw: number): BusinessWindow {
  let startHour = Number.isFinite(startHourRaw) ? startHourRaw : 8;
  let endHour = Number.isFinite(endHourRaw) ? endHourRaw : 24;

  // 방어: 잘못 들어온 값 clamp
  if (startHour < 0) startHour = 0;
  if (startHour > 23) startHour = 23;

  // ⭐ 핵심: endHour가 startHour 이하이면 "다음날"로 해석해서 +24
  // 예) start=8, end=4 -> end=28
  if (endHour <= startHour) endHour += 24;

  if (endHour < 1) endHour = 1;
  if (endHour > 48) endHour = 48;

  const startM = startHour * 60;
  const endM = endHour * 60;

  return { startHour, endHour, startM, endM };
}

function parseTimeHM(timeStr: string): { h: number; m: number } | null {
  if (typeof timeStr !== 'string') return null;
  const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;

  const h = Number(m[1]);
  const mm = Number(m[2]);

  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  if (h < 0 || h > 23) return null;
  if (mm < 0 || mm > 59) return null;

  return { h, m: mm };
}

// 영업일 기준 minute(새벽은 +1440)
function toBusinessMinute(h: number, m: number, startM: number) {
  let min = h * 60 + m;
  if (min < startM) min += 1440;
  return min;
}

// start는 end 경계 포함하면 안됨(04:00 시작 불가), end는 end 경계 포함 가능(04:00 종료 가능)
function validateScheduleWindow(start: string, end: string, bw: BusinessWindow) {
  const s = parseTimeHM(start);
  const e = parseTimeHM(end);
  if (!s || !e) {
    return { ok: false, message: 'Invalid time format. Use HH:mm.' as const };
  }

  const sM = toBusinessMinute(s.h, s.m, bw.startM);
  const eM = toBusinessMinute(e.h, e.m, bw.startM);

  // start: [startM, endM)
  if (!(sM >= bw.startM && sM < bw.endM)) {
    return {
      ok: false,
      message: `Start time ${start} is outside business hours.`,
    } as const;
  }

  // end: (startM, endM]  (실제로는 end > start가 보장되니 범위는 <= endM만 체크)
  if (!(eM >= bw.startM && eM <= bw.endM)) {
    return {
      ok: false,
      message: `End time ${end} is outside business hours.`,
    } as const;
  }

  if (eM <= sM) {
    return {
      ok: false,
      message: `End time must be after start time (business-day 기준).`,
    } as const;
  }

  return { ok: true, startMin: sM, endMin: eM } as const;
}

async function getBusinessWindowForUser(userId: string): Promise<BusinessWindow> {
  // 기본값
  let startHour = 8;
  let endHour = 24;

  try {
    const user: any = await SignupUser.findById(userId)
      .select('_id corp corporationId')
      .lean();

    // user.corporationId 우선, 없으면 user.corp 사용
    const corpKeyRaw =
      user?.corporationId ??
      user?.corp ??
      null;

    let corpDoc: any = null;

    if (corpKeyRaw) {
      // corpKeyRaw가 ObjectId/문자열/객체 모두 방어
      let corpKey: string | null = null;

      if (typeof corpKeyRaw === 'string') {
        corpKey = corpKeyRaw;
      } else if (typeof corpKeyRaw === 'object') {
        if (corpKeyRaw._id) corpKey = String(corpKeyRaw._id);
        else if (corpKeyRaw.id) corpKey = String(corpKeyRaw.id);
        else if (corpKeyRaw.name) corpKey = String(corpKeyRaw.name);
      }

      if (corpKey) {
        if (isObjectIdLike(corpKey)) {
          corpDoc = await Corporation.findById(corpKey).lean();
        }
        if (!corpDoc) {
          // name 매칭
          corpDoc = await Corporation.findOne({ name: corpKey }).lean();
        }
      }
    }

    if (corpDoc) {
      startHour = Number.isFinite(corpDoc.businessDayStartHour) ? corpDoc.businessDayStartHour : startHour;
      endHour = Number.isFinite(corpDoc.businessDayEndHour) ? corpDoc.businessDayEndHour : endHour;
    }
  } catch (e) {
    // 실패해도 기본값으로 진행
  }

  return normalizeBusinessWindow(startHour, endHour);
}

/* =========================
   Conflict Check (Business Day)
========================= */

// 영업일 기준으로 overlap 검사
function isTimeOverlappingBW(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
  bw: BusinessWindow
): boolean {
  const v1 = validateScheduleWindow(start1, end1, bw);
  const v2 = validateScheduleWindow(start2, end2, bw);

  // 기존 데이터가 잘못된 경우도 있을 수 있으니, 그 경우는 overlap 판단에서 제외
  if (!v1.ok || !v2.ok) return false;

  return v1.startMin! < v2.endMin! && v2.startMin! < v1.endMin!;
}

// 중복 스케줄 검사 함수 (영업일 기준)
async function checkScheduleConflictBW(
  userId: string,
  date: string,
  start: string,
  end: string,
  bw: BusinessWindow,
  excludeId?: string
) {
  const existingSchedules = await Schedule.find({
    userId,
    date,
    ...(excludeId && { _id: { $ne: excludeId } }),
  })
    .select('_id start end')
    .lean();

  for (const schedule of existingSchedules) {
    if (isTimeOverlappingBW(start, end, schedule.start, schedule.end, bw)) {
      return {
        conflict: true,
        conflictingSchedule: {
          id: schedule._id,
          start: schedule.start,
          end: schedule.end,
        },
      };
    }
  }

  return { conflict: false, conflictingSchedule: null };
}

/* =========================
   GET
========================= */

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
        users.forEach((user: any) => {
          userMap.set(user._id.toString(), {
            name: user.name,
            corp: user.corp,
            eid: user.eid,
            category: user.category,
            position: Array.isArray(user.userType) && user.userType.length > 0
              ? user.userType.join(', ')
              : (user.userType || 'Barista'),
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
    users.forEach((user: any) => {
      userMap.set(user._id.toString(), {
        name: user.name,
        corp: user.corp,
        eid: user.eid,
        category: user.category,
        position: Array.isArray(user.userType) && user.userType.length > 0
          ? user.userType.join(', ')
          : (user.userType || 'Barista'),
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

      const filteredWithUserData = withUserData.filter((s: any) => {
        if (!filterType || !filterKeyword) return true;
        const value = s[filterType as keyof typeof s];
        return value?.toString().toLowerCase().includes(filterKeyword);
      });

      const filtered = filteredWithUserData.filter((s: any) =>
        isWithinInterval(parseISO(s.date), { start: weekStart, end: weekEnd })
      );

      const scheduleMap: Record<string, any> = {};
      filtered.forEach((s: any) => {
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

/* =========================
   POST (Create)
========================= */

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();

    // userType 기본값 설정
    if (!data.userType) {
      data.userType = 'Barista';
    }

    // 필수 필드 검증
    if (!data.userId || !data.date || !data.start || !data.end) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, date, start, end' },
        { status: 400 }
      );
    }

    // ✅ 회사 영업시간 기반 검증
    const bw = await getBusinessWindowForUser(data.userId);
    const v = validateScheduleWindow(data.start, data.end, bw);
    if (!v.ok) {
      return NextResponse.json(
        {
          error: 'Invalid schedule time',
          message: v.message,
          businessHours: { startHour: bw.startHour, endHour: bw.endHour },
        },
        { status: 400 }
      );
    }

    // ✅ 영업일 기준 중복 검사
    const conflictCheck = await checkScheduleConflictBW(
      data.userId,
      data.date,
      data.start,
      data.end,
      bw
    );

    if (conflictCheck.conflict) {
      return NextResponse.json(
        {
          error: 'Schedule conflict detected',
          message: `Time ${data.start}-${data.end} overlaps with existing schedule ${conflictCheck.conflictingSchedule!.start}-${conflictCheck.conflictingSchedule!.end}`,
          conflictingSchedule: conflictCheck.conflictingSchedule,
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

/* =========================
   PUT (Update)
========================= */

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
    const existingSchedule: any = await Schedule.findById(id);
    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    const targetUserId = existingSchedule.userId.toString();
    const targetDate = updates.date || existingSchedule.date;
    const newStart = updates.start || existingSchedule.start;
    const newEnd = updates.end || existingSchedule.end;

    // ✅ 회사 영업시간 기반 검증 (start/end/date 중 하나라도 변경되면 검증)
    if (updates.start || updates.end || updates.date) {
      const bw = await getBusinessWindowForUser(targetUserId);
      const v = validateScheduleWindow(newStart, newEnd, bw);
      if (!v.ok) {
        return NextResponse.json(
          {
            error: 'Invalid schedule time',
            message: v.message,
            businessHours: { startHour: bw.startHour, endHour: bw.endHour },
          },
          { status: 400 }
        );
      }

      // ✅ 영업일 기준 중복 검사 (현재 스케줄 제외)
      const conflictCheck = await checkScheduleConflictBW(
        targetUserId,
        targetDate,
        newStart,
        newEnd,
        bw,
        id
      );

      if (conflictCheck.conflict) {
        return NextResponse.json(
          {
            error: 'Schedule conflict detected',
            message: `Time ${newStart}-${newEnd} overlaps with existing schedule ${conflictCheck.conflictingSchedule!.start}-${conflictCheck.conflictingSchedule!.end}`,
            conflictingSchedule: conflictCheck.conflictingSchedule,
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

/* =========================
   DELETE
========================= */

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
