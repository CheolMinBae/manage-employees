import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import SystemSettings from '@models/SystemSettings';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    
    if (key) {
      const setting = await SystemSettings.findOne({ key }).lean();
      return NextResponse.json(setting);
    }
    
    const settings = await SystemSettings.find().lean();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error in GET /api/system-settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system settings', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();
    
    if (!data.key || data.value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: key, value' },
        { status: 400 }
      );
    }

    const newSetting = await SystemSettings.create(data);
    return NextResponse.json(newSetting);
  } catch (error: any) {
    console.error('Error in POST /api/system-settings:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Setting key already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create system setting', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();
    const { key, value, description } = data;
    
    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: key, value' },
        { status: 400 }
      );
    }

    const updated = await SystemSettings.findOneAndUpdate(
      { key },
      { value, ...(description && { description }) },
      { new: true, upsert: true }
    );
    
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error in PUT /api/system-settings:', error);
    return NextResponse.json(
      { error: 'Failed to update system setting', message: error.message },
      { status: 500 }
    );
  }
} 