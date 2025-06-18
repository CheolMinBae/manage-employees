import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import Schedule from '@models/Schedule';

export async function POST(req: NextRequest) {
  await dbConnect();
  const { weekDates } = await req.json();
  if (!Array.isArray(weekDates) || weekDates.length === 0) {
    return NextResponse.json({ error: 'weekDates required' }, { status: 400 });
  }
  // 해당 주간에 approved가 false인 스케줄이 하나라도 있으면 false
  const unapproved = await Schedule.find({
    date: { $in: weekDates },
    approved: false
  }).limit(1);
  return NextResponse.json({ publishable: unapproved.length === 0 });
} 