import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import ScheduleTemplate from '@models/ScheduleTemplate';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    
    const templates = await ScheduleTemplate.find()
      .sort({ order: 1, name: 1 })
      .lean();
    
    return NextResponse.json(templates);
  } catch (error: any) {
    console.error('Error in GET /api/schedule-templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule templates', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();
    
    // 필수 필드 검증
    if (!data.name || !data.displayName || !data.startTime || !data.endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: name, displayName, startTime, endTime' },
        { status: 400 }
      );
    }

    // 시간 형식 검증
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM format' },
        { status: 400 }
      );
    }

    // 시간 순서 검증
    const [startHour, startMin] = data.startTime.split(':').map(Number);
    const [endHour, endMin] = data.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes >= endMinutes) {
      return NextResponse.json(
        { error: 'Start time must be before end time' },
        { status: 400 }
      );
    }

    const newTemplate = await ScheduleTemplate.create(data);
    return NextResponse.json(newTemplate);
  } catch (error: any) {
    console.error('Error in POST /api/schedule-templates:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Template name already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create schedule template', message: error.message },
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
        { error: 'Missing template ID' },
        { status: 400 }
      );
    }

    // 시간 형식 검증 (시간이 업데이트되는 경우)
    if (updates.startTime || updates.endTime) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (updates.startTime && !timeRegex.test(updates.startTime)) {
        return NextResponse.json(
          { error: 'Invalid start time format. Use HH:MM format' },
          { status: 400 }
        );
      }
      if (updates.endTime && !timeRegex.test(updates.endTime)) {
        return NextResponse.json(
          { error: 'Invalid end time format. Use HH:MM format' },
          { status: 400 }
        );
      }
    }

    const updated = await ScheduleTemplate.findByIdAndUpdate(id, updates, { 
      new: true,
      runValidators: true 
    });
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error in PUT /api/schedule-templates:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule template', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    
    const deleted = await ScheduleTemplate.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/schedule-templates:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule template', message: error.message },
      { status: 500 }
    );
  }
} 