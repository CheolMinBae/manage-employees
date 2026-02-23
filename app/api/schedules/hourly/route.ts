import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import Schedule from '@models/Schedule';
import SignupUser from '@models/SignupUser';
import Corporation from '@models/Corporation';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || dayjs().format('YYYY-MM-DD');
  const corp = searchParams.get('corp');

  try {
    // Corporation 영업시간 조회
    let businessStartHour = 3;
    let businessEndHour = 23;
    if (corp) {
      const corpDoc = await Corporation.findOne({ name: corp }).lean() as any;
      if (corpDoc) {
        businessStartHour = Number.isFinite(corpDoc.businessDayStartHour) ? corpDoc.businessDayStartHour : 3;
        businessEndHour = Number.isFinite(corpDoc.businessDayEndHour) ? corpDoc.businessDayEndHour : 23;
      }
    }
    // endHour > 24인 경우 (자정 넘김) 처리: 최대 47까지 지원
    if (businessEndHour <= businessStartHour) businessEndHour += 24;
    const totalHours = businessEndHour - businessStartHour;

    // 사용자 필터 (corp이 지정되면 해당 회사 직원만)
    const userFilter: any = { status: { $ne: 'deleted' } };
    if (corp) userFilter.corp = corp;

    const allUsers = await SignupUser.find(userFilter)
      .select('_id name position corp eid category userType hourlyRate')
      .lean();

    const userIdSet = new Set(allUsers.map((u: any) => u._id.toString()));

    let schedules = await Schedule.find({ date }).lean();
    if (corp) {
      schedules = schedules.filter((s: any) => userIdSet.has(String(s.userId)));
    }

    interface UserEntry {
      _id: string;
      name: string;
      position: string;
      corp: string;
      eid: string | number;
      category: string;
      userType: string[];
    }

    const userMapping: { [key: string]: UserEntry } = {};
    allUsers.forEach(user => {
      const userId = (user._id as any).toString();
      userMapping[userId] = {
        _id: userId,
        name: user.name,
        position: user.position,
        corp: user.corp,
        eid: user.eid,
        category: user.category,
        userType: Array.isArray(user.userType) ? user.userType : (user.userType ? [user.userType] : [])
      };
    });

    // 동적 시간대별 근무자 계산 (Corporation 영업시간 기준)
    const hourlyData = Array.from({ length: totalHours }, (_, i) => {
      const hour = businessStartHour + i;
      // 24시 이상인 경우 실제 시각은 hour % 24
      const actualHour = hour % 24;
      const workingEmployees: Array<{
        name: string;
        position: string;
        shift: string;
        userType: string;
      }> = [];

      schedules.forEach(schedule => {
        const startHour = parseInt(schedule.start.split(':')[0]);
        const startMinute = parseInt(schedule.start.split(':')[1]);
        const endHour = parseInt(schedule.end.split(':')[0]);
        const endMinute = parseInt(schedule.end.split(':')[1]);

        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        const currentHourMinutes = actualHour * 60;

        if (currentHourMinutes >= startTotalMinutes && currentHourMinutes < endTotalMinutes) {
          const user = userMapping[schedule.userId];
          if (user) {
            workingEmployees.push({
              name: user.name,
              position: user.position || 'Employee',
              shift: `${schedule.start}-${schedule.end}`,
              userType: Array.isArray(user.userType) ? user.userType.join(', ') : (user.userType || 'Employee')
            });
          }
        }
      });

      return {
        hour: actualHour,
        count: workingEmployees.length,
        employees: workingEmployees
      };
    });

    // 개별 직원의 시간대별 근무 상태 (0~23 인덱스 유지)
    const employeeSchedules = allUsers.map(user => {
      const userId = (user._id as any).toString();
      const userSchedules = schedules.filter(s => String(s.userId) === userId);

      const hourlyStatus = Array.from({ length: 24 }, (_, hour) => {
        const scheduleForHour = userSchedules.find(schedule => {
          const sH = parseInt(schedule.start.split(':')[0]);
          const sM = parseInt(schedule.start.split(':')[1]);
          const eH = parseInt(schedule.end.split(':')[0]);
          const eM = parseInt(schedule.end.split(':')[1]);

          const startMin = sH * 60 + sM;
          const endMin = eH * 60 + eM;
          const hourStart = hour * 60;
          const hourEnd = (hour + 1) * 60;

          return startMin < hourEnd && endMin > hourStart;
        });

        if (scheduleForHour) {
          const sH = parseInt(scheduleForHour.start.split(':')[0]);
          const sM = parseInt(scheduleForHour.start.split(':')[1]);
          const eH = parseInt(scheduleForHour.end.split(':')[0]);
          const eM = parseInt(scheduleForHour.end.split(':')[1]);

          const startMin = sH * 60 + sM;
          const endMin = eH * 60 + eM;
          const hourStart = hour * 60;
          const hourEnd = (hour + 1) * 60;

          const workingStart = Math.max(startMin, hourStart);
          const workingEnd = Math.min(endMin, hourEnd);
          const workingRatio = (workingEnd - workingStart) / 60;

          return {
            isWorking: workingRatio > 0,
            workingRatio: Math.round(workingRatio * 100) / 100,
            shift: `${scheduleForHour.start}-${scheduleForHour.end}`,
            approved: scheduleForHour.approved || false
          };
        }

        return { isWorking: false, workingRatio: 0, shift: null, approved: false };
      });

      return {
        userId,
        name: user.name,
        position: user.position,
        corp: user.corp,
        eid: user.eid,
        category: user.category,
        userType: Array.isArray(user.userType) ? user.userType.join(', ') : (user.userType || 'Employee'),
        hourlyRate: (user as any).hourlyRate || 0,
        hourlyStatus,
        hasSchedule: userSchedules.length > 0
      };
    });

    employeeSchedules.sort((a, b) => {
      if (a.hasSchedule && !b.hasSchedule) return -1;
      if (!a.hasSchedule && b.hasSchedule) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      date,
      hourlyData,
      employeeSchedules,
      businessHours: { start: businessStartHour, end: businessEndHour },
    });

  } catch (error) {
    console.error('Error fetching hourly data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hourly data' },
      { status: 500 }
    );
  }
}
