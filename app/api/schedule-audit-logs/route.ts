import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@libs/db';
import ScheduleAuditLog from '@models/ScheduleAuditLog';
import { authOptions } from '@/libs/auth';
import { apiServerError } from '@libs/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.position !== 'admin') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const filter: any = {};
    const corp = searchParams.get('corp');
    const action = searchParams.get('action');
    const date = searchParams.get('date');
    const targetUserId = searchParams.get('targetUserId');

    if (corp) filter.corp = corp;
    if (action) filter.action = action;
    if (date) filter.date = date;
    if (targetUserId) filter.targetUserId = targetUserId;

    const logs = await ScheduleAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json(logs);
  } catch (error) {
    return apiServerError('Failed to fetch schedule audit logs', error);
  }
}
