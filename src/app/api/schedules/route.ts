// src/app/api/schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import Schedule from '@models/Schedule';

export async function GET() {
  await dbConnect();
  const schedules = await Schedule.find();
  return NextResponse.json(schedules);
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
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await Schedule.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
