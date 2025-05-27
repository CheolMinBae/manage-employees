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

export async function GET(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');
  const start = searchParams.get('weekStart');
  const filterType = searchParams.get('type');
  const filterKeyword = searchParams.get('keyword')?.toLowerCase();

  const schedules = await Schedule.find().select('+createdAt').lean();

  const userIds = Array.from(new Set(schedules.map((s: any) => s.userId.toString())));
  const users = await SignupUser.find({ _id: { $in: userIds } })
    .select('_id name corp eid category position userType')
    .lean();

  const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

  const withUserData = schedules.map((s: any) => {
    const user = userMap.get(s.userId.toString());
    return {
      ...s,
      userId: s.userId,
      name: user?.name || 'Unknown',
      corp: user?.corp || 'Unknown',
      eid: user?.eid || 'Unknown',
      category: user?.category || 'Unknown',
      position: user?.userType || 'Barista',
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
