// src/app/api/schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import Schedule from '@models/Schedule';
import SignupUser from '@models/SignupUser';
import Corporation from '@models/Corporation';
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import '@/constants/dateConfig'; // dayjs 플러그인 초기화
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { apiServerError } from '@libs/api-response';

export const dynamic = 'force-dynamic';

/* =========================
   Business Day Helpers
========================= */

type BusinessWindow = {
  startHour: number;
  endHour: number;
  startM: number;
  endM: number;
};

function isObjectIdLike(v: string) {
  return /^[0-9a-fA-F]{24}$/.test(v);
}

function normalizeBusinessWindow(startHourRaw: number, endHourRaw: number): BusinessWindow {
  let startHour = Number.isFinite(startHourRaw) ? startHourRaw : 8;
  let endHour = Number.isFinite(endHourRaw) ? endHourRaw : 24;

  if (startHour < 0) startHour = 0;
  if (startHour > 23) startHour = 23;
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

function toBusinessMinute(h: number, m: number, startM: number) {
  let min = h * 60 + m;
  if (min < startM) min += 1440;
  return min;
}

function validateScheduleWindow(start: string, end: string, bw: BusinessWindow) {
  const s = parseTimeHM(start);
  const e = parseTimeHM(end);
  if (!s || !e) {
    return { ok: false, message: 'Invalid time format. Use HH:mm.' as const };
  }

  const sM = toBusinessMinute(s.h, s.m, bw.startM);
  const eM = toBusinessMinute(e.h, e.m, bw.startM);

  if (!(sM >= bw.startM && sM < bw.endM)) {
    return { ok: false, message: `Start time ${start} is outside business hours.` } as const;
  }
  if (!(eM >= bw.startM && eM <= bw.endM)) {
    return { ok: false, message: `End time ${end} is outside business hours.` } as const;
  }
  if (eM <= sM) {
    return { ok: false, message: `End time must be after start time (business-day 기준).` } as const;
  }
  return { ok: true, startMin: sM, endMin: eM } as const;
}

async function getBusinessWindowForUser(userId: string): Promise<BusinessWindow> {
  let startHour = 8;
  let endHour = 24;

  try {
    const user: any = await SignupUser.findById(userId)
      .select('_id corp corporationId')
      .lean();

    const corpKeyRaw = user?.corporationId ?? user?.corp ?? null;
    let corpDoc: any = null;

    if (corpKeyRaw) {
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
   Conflict Check
========================= */

function isTimeOverlappingBW(
  start1: string, end1: string,
  start2: string, end2: string,
  bw: BusinessWindow
): boolean {
  const v1 = validateScheduleWindow(start1, end1, bw);
  const v2 = validateScheduleWindow(start2, end2, bw);
  if (!v1.ok || !v2.ok) return false;
  return v1.startMin! < v2.endMin! && v2.startMin! < v1.endMin!;
}

async function checkScheduleConflictBW(
  userId: string, date: string,
  start: string, end: string,
  bw: BusinessWindow, excludeId?: string
) {
  const existingSchedules = await Schedule.find({
    userId, date,
    ...(excludeId && { _id: { $ne: excludeId } }),
  }).select('_id start end').lean();

  for (const schedule of existingSchedules) {
    if (isTimeOverlappingBW(start, end, schedule.start, schedule.end, bw)) {
      return {
        conflict: true,
        conflictingSchedule: { id: schedule._id, start: schedule.start, end: schedule.end },
      };
    }
  }
  return { conflict: false, conflictingSchedule: null };
}

/* =========================
   공통 헬퍼: 사용자 데이터 매핑
========================= */

async function buildUserMap(userIds: string[]) {
  const users = await SignupUser.find({ _id: { $in: userIds } })
    .select('_id name corp eid category position userType')
    .lean();

  const userMap = new Map<string, any>();
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
  return userMap;
}

function populateUserData(schedules: any[], userMap: Map<string, any>) {
  return schedules.map((s: any) => {
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
}

/* =========================
   GET - 필터 조회 (userId, date, userType)
========================= */

async function handleFilteredGet(params: { userId?: string | null; date?: string | null; userType?: string | null }) {
  const filter: any = {};
  if (params.userId) {
    // userId가 ObjectId로 저장된 경우와 문자열로 저장된 경우 모두 대응
    if (mongoose.Types.ObjectId.isValid(params.userId)) {
      filter.$or = [
        { userId: params.userId },
        { userId: new mongoose.Types.ObjectId(params.userId) }
      ];
    } else {
      filter.userId = params.userId;
    }
  }
  if (params.date) filter.date = params.date;
  if (params.userType) filter.userType = params.userType;

  // Mongoose 스키마 캐스팅을 우회하기 위해 collection 직접 쿼리
  const db = mongoose.connection.db;
  const schedules = await db.collection('schedules').find(filter).toArray();

  // userType 필터 시 사용자 데이터 populate
  if (params.userType && schedules.length > 0) {
    const userIds = Array.from(new Set(schedules.map((s: any) => s.userId.toString())));
    const userMap = await buildUserMap(userIds);
    return NextResponse.json(populateUserData(schedules, userMap));
  }

  return NextResponse.json(schedules);
}

/* =========================
   GET - 대시보드 (mode=dashboard)
========================= */

async function handleDashboardGet(
  withUserData: any[],
  weekStartStr: string | null,
  filterType: string | null,
  filterKeyword: string | null,
) {
  const today = weekStartStr ? dayjs(weekStartStr) : dayjs();
  const weekStart = today.startOf('week');
  const weekEnd = today.endOf('week');

  // 필터 적용
  const filtered = withUserData
    .filter((s: any) => {
      if (!filterType || !filterKeyword) return true;
      const value = s[filterType as keyof typeof s];
      return value?.toString().toLowerCase().includes(filterKeyword);
    })
    .filter((s: any) => {
      const d = dayjs(s.date);
      return d.isBetween(weekStart, weekEnd, 'day', '[]');
    });

  // 사용자별 그룹핑
  const scheduleMap: Record<string, any> = {};
  filtered.forEach((s: any) => {
    const status = s.approved === true ? 'approved' : 'pending';

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

    const slotData = { _id: s._id, start: s.start, end: s.end, status };

    if (existing) {
      existing.slots.push(slotData);
    } else {
      scheduleMap[s.userId].shifts.push({ date: s.date, slots: [slotData] });
    }
  });

  // 주간 날짜 배열
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    weekDates.push(weekStart.add(i, 'day').format('YYYY-MM-DD'));
  }

  return NextResponse.json({
    weekTitle: `Week of ${weekStart.format('MMM D')} – ${weekEnd.format('MMM D')}`,
    weekRange: `${weekStart.format('MMM D')} – ${weekEnd.format('MMM D')}`,
    dates: weekDates,
    scheduleData: Object.values(scheduleMap),
  });
}

/* =========================
   GET (라우터)
========================= */

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode');
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const userType = searchParams.get('userType');

    // 1) 필터 조회: userId, date, userType 중 하나라도 있으면
    if (userId || date || userType) {
      return handleFilteredGet({ userId, date, userType });
    }

    // 2) 전체 스케줄 + 사용자 데이터 매핑 (대시보드, 전체조회 공통)
    const schedules = await Schedule.find().select('+createdAt').lean();
    const userIds = Array.from(new Set(schedules.map((s: any) => s.userId.toString())));
    const userMap = await buildUserMap(userIds);
    const withUserData = populateUserData(schedules, userMap);

    // 3) 대시보드 모드
    if (mode === 'dashboard') {
      return handleDashboardGet(
        withUserData,
        searchParams.get('weekStart'),
        searchParams.get('type'),
        searchParams.get('keyword')?.toLowerCase() || null,
      );
    }

    // 4) 전체 조회
    return NextResponse.json(withUserData);
  } catch (error) {
    return apiServerError('Failed to fetch schedules', error);
  }
}

/* =========================
   POST (Create)
========================= */

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();

    if (!data.userType) data.userType = 'Barista';

    if (!data.userId || !data.date || !data.start || !data.end) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, date, start, end' },
        { status: 400 }
      );
    }

    const bw = await getBusinessWindowForUser(data.userId);
    const v = validateScheduleWindow(data.start, data.end, bw);
    if (!v.ok) {
      return NextResponse.json(
        { error: 'Invalid schedule time', message: v.message, businessHours: { startHour: bw.startHour, endHour: bw.endHour } },
        { status: 400 }
      );
    }

    const conflictCheck = await checkScheduleConflictBW(data.userId, data.date, data.start, data.end, bw);
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
  } catch (error) {
    return apiServerError('Failed to create schedule', error);
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
      return NextResponse.json({ error: 'Missing schedule ID' }, { status: 400 });
    }

    const existingSchedule: any = await Schedule.findById(id);
    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const targetUserId = existingSchedule.userId.toString();
    const targetDate = updates.date || existingSchedule.date;
    const newStart = updates.start || existingSchedule.start;
    const newEnd = updates.end || existingSchedule.end;

    if (updates.start || updates.end || updates.date) {
      const bw = await getBusinessWindowForUser(targetUserId);
      const v = validateScheduleWindow(newStart, newEnd, bw);
      if (!v.ok) {
        return NextResponse.json(
          { error: 'Invalid schedule time', message: v.message, businessHours: { startHour: bw.startHour, endHour: bw.endHour } },
          { status: 400 }
        );
      }

      const conflictCheck = await checkScheduleConflictBW(targetUserId, targetDate, newStart, newEnd, bw, id);
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

    // 승인 상태 변경 시 승인자 정보 기록
    if (updates.approved === true && existingSchedule.approved !== true) {
      const session = await getServerSession(authOptions);
      updates.approvedBy = session?.user?.name || 'Unknown';
      updates.approvedAt = new Date();
    } else if (updates.approved === false) {
      updates.approvedBy = null;
      updates.approvedAt = null;
    }

    const updated = await Schedule.findByIdAndUpdate(id, updates, { new: true });
    return NextResponse.json(updated);
  } catch (error) {
    return apiServerError('Failed to update schedule', error);
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
    const deleteAll = searchParams.get('deleteAll');

    if (deleteAll === 'true' && userId && date) {
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

    const deleted = await Schedule.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiServerError('Failed to delete schedule', error);
  }
}
