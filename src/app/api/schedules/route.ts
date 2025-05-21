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

export async function GET(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');
  const start = searchParams.get('weekStart');
  const filterType = searchParams.get('type'); // 'name', 'corp', 'category', 'eid'
  const filterKeyword = searchParams.get('keyword')?.toLowerCase();

  const schedules = await Schedule.find().lean();

  const userIds = Array.from(new Set(schedules.map((s: any) => s.userId.toString())));
  const users = await SignupUser.find({ _id: { $in: userIds } })
    .select('_id name corp eid category position userType')
    .lean();

  const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

  const withUserData = schedules.map((s: any) => {
    const user = userMap.get(s.userId.toString());
    return {
      ...s,
      name: user?.name || 'Unknown',
      corp: user?.corp || 'Unknown',
      eid: user?.eid || 'Unknown',
      category: user?.category || 'Unknown',
      position: user?.userType || 'Barista',
    };
  });

  // 대시보드 모드
  if (mode === 'dashboard') {
    const today = start ? parseISO(start) : new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // 일요일
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

    // 필터 적용
    const filteredWithUserData = withUserData.filter((s) => {
      if (!filterType || !filterKeyword) return true;
      const value = s[filterType as keyof typeof s];
      return value?.toString().toLowerCase().includes(filterKeyword);
    });

    // 주간 범위 내 일정만 추출
    const filtered = filteredWithUserData.filter((s) =>
      isWithinInterval(parseISO(s.date), { start: weekStart, end: weekEnd })
    );

    // 사용자별 스케줄 병합
    const scheduleMap: Record<string, any> = {};
    filtered.forEach((s) => {
      if (!scheduleMap[s.userId]) {
        scheduleMap[s.userId] = {
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

      if (existing) {
        existing.slots.push({ start: s.start, end: s.end });
      } else {
        scheduleMap[s.userId].shifts.push({
          date: s.date,
          slots: [{ start: s.start, end: s.end }],
        });
      }
    });

    // 주간 날짜 배열
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(format(d, 'yyyy-MM-dd'));
    }

    const weekTitle = `Week of ${format(weekStart, 'MMM d')} – ${format(
      weekEnd,
      'MMM d'
    )}`;
    const weekRange = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`;

    return NextResponse.json({
      weekTitle,
      weekRange,
      dates: weekDates,
      scheduleData: Object.values(scheduleMap),
    });
  }

  // 기본 반환
  return NextResponse.json(withUserData);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const data = await req.json();
  const newSchedule = await Schedule.create(data);
  return NextResponse.json(newSchedule);
}

export async function PUT(req: NextRequest) {
  await dbConnect();
  const data = await req.json();
  const { id, ...updates } = data;
  const updated = await Schedule.findByIdAndUpdate(id, updates, { new: true });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id)
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await Schedule.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
