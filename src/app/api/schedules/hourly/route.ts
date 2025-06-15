import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import Schedule from '@models/Schedule';
import SignupUser from '@models/SignupUser';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

  try {
    // 해당 날짜의 승인된 스케줄만 가져오기
    const schedules = await Schedule.find({
      date: date,
      approved: true
    }).lean();

    // 모든 직원 정보 가져오기 (position이 employee인 사용자만)
    const allUsers = await SignupUser.find({
      position: 'employee'
    })
      .select('_id name position corp eid category userType')
      .lean();

    const userMap = new Map(allUsers.map((u: any) => [u._id.toString(), u]));

    // 시간대별 근무자 계산
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
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

        // 시작 시간과 종료 시간을 분 단위로 변환
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        const currentHourMinutes = hour * 60;

        // 현재 시간이 근무 시간에 포함되는지 확인
        // 시간 경계에서는 시작 시간은 포함, 종료 시간은 제외
        if (currentHourMinutes >= startTotalMinutes && currentHourMinutes < endTotalMinutes) {
          const user = userMap.get(schedule.userId);
          if (user) {
            workingEmployees.push({
              name: user.name,
              position: user.position || 'Employee',
              shift: `${schedule.start}-${schedule.end}`,
              userType: user.userType
            });
          }
        }
      });

      return {
        hour,
        count: workingEmployees.length,
        employees: workingEmployees
      };
    });

    // 개별 직원의 시간대별 근무 상태 계산
    const employeeSchedules = allUsers.map((user: any) => {
      const userSchedules = schedules.filter(s => s.userId === user._id.toString());
      const hourlyStatus = Array.from({ length: 24 }, (_, hour) => {
        const currentHourStart = hour * 60; // 현재 시간의 시작 (분 단위)
        const currentHourEnd = (hour + 1) * 60; // 현재 시간의 끝 (분 단위)
        
        let totalWorkingMinutes = 0;
        let shifts: string[] = [];
        
        for (const schedule of userSchedules) {
          const startHour = parseInt(schedule.start.split(':')[0]);
          const startMinute = parseInt(schedule.start.split(':')[1]);
          const endHour = parseInt(schedule.end.split(':')[0]);
          const endMinute = parseInt(schedule.end.split(':')[1]);

          const startTotalMinutes = startHour * 60 + startMinute;
          const endTotalMinutes = endHour * 60 + endMinute;

          // 현재 시간대와 근무 시간의 겹치는 부분 계산
          const overlapStart = Math.max(currentHourStart, startTotalMinutes);
          const overlapEnd = Math.min(currentHourEnd, endTotalMinutes);
          
          if (overlapStart < overlapEnd) {
            totalWorkingMinutes += (overlapEnd - overlapStart);
            shifts.push(`${schedule.start}-${schedule.end}`);
          }
        }
        
        const workingRatio = totalWorkingMinutes / 60; // 60분 기준으로 비율 계산
        
        return {
          isWorking: workingRatio > 0,
          workingRatio: workingRatio,
          shift: shifts.length > 0 ? shifts.join(', ') : null
        };
      });

      return {
        userId: user._id.toString(),
        name: user.name,
        position: user.position || 'Employee',
        corp: user.corp,
        eid: user.eid,
        category: user.category,
        userType: user.userType,
        hourlyStatus,
        hasSchedule: userSchedules.length > 0
      };
    });

    // 스케줄이 있는 직원을 위쪽에, 없는 직원을 아래쪽에 정렬
    employeeSchedules.sort((a, b) => {
      if (a.hasSchedule && !b.hasSchedule) return -1;
      if (!a.hasSchedule && b.hasSchedule) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      date,
      hourlyData,
      employeeSchedules
    });

  } catch (error) {
    console.error('Error fetching hourly data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hourly data' },
      { status: 500 }
    );
  }
} 