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
    }).lean();

    // 모든 사용자 정보 가져오기
    const allUsers = await SignupUser.find({
      status: { $ne: 'deleted' }
    })
      .select('_id name position corp eid category userType')
      .lean();

    interface User {
      _id: string;
      name: string;
      position: string;
      corp: string;
      eid: string | number;
      category: string;
      userType: string[];
    }

    // User 타입 정의 및 매핑
    const userMapping: { [key: string]: User } = {};
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

    // 시간대별 근무자 계산 (캘리포니아 시간 기준 3am~11pm)
    const hourlyData = Array.from({ length: 21 }, (_, i) => {
      const hour = i + 3; // 3~23 (캘리포니아 현지 시간)
      const workingEmployees: Array<{
        name: string;
        position: string;
        shift: string;
        userType: string;
      }> = [];

      schedules.forEach(schedule => {
        // start, end는 이미 캘리포니아 현지 시간 문자열임
        const startHour = parseInt(schedule.start.split(':')[0]);
        const startMinute = parseInt(schedule.start.split(':')[1]);
        const endHour = parseInt(schedule.end.split(':')[0]);
        const endMinute = parseInt(schedule.end.split(':')[1]);

        // 시작 시간과 종료 시간을 분 단위로 변환 (캘리포니아 현지 시간)
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        const currentHourMinutes = hour * 60;

        // 현재 시간이 근무 시간에 포함되는지 확인 (캘리포니아 현지 시간)
        // 시간 경계에서는 시작 시간은 포함, 종료 시간은 제외
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
        hour,
        count: workingEmployees.length,
        employees: workingEmployees
      };
    });

    // 개별 직원의 시간대별 근무 상태 계산 (캘리포니아 시간 기준 3am~11pm)
    const employeeSchedules = allUsers.map(user => {
      const userId = (user._id as any).toString();
      const userSchedules = schedules.filter(s => s.userId === userId);
      
      // 시간별 상태 계산
      const hourlyStatus = Array.from({ length: 24 }, (_, hour) => {
        // 해당 시간대(hour:00 ~ hour+1:00)에 겹치는 스케줄 찾기
        const scheduleForHour = userSchedules.find(schedule => {
          const startHour = parseInt(schedule.start.split(':')[0]);
          const startMinute = parseInt(schedule.start.split(':')[1]);
          const endHour = parseInt(schedule.end.split(':')[0]);
          const endMinute = parseInt(schedule.end.split(':')[1]);
          
          const startTotalMinutes = startHour * 60 + startMinute;
          const endTotalMinutes = endHour * 60 + endMinute;
          const currentHourStart = hour * 60;
          const currentHourEnd = (hour + 1) * 60;
          
          // 스케줄과 현재 시간대가 겹치는지 확인
          return startTotalMinutes < currentHourEnd && endTotalMinutes > currentHourStart;
        });

        if (scheduleForHour) {
          const startHour = parseInt(scheduleForHour.start.split(':')[0]);
          const startMinute = parseInt(scheduleForHour.start.split(':')[1]);
          const endHour = parseInt(scheduleForHour.end.split(':')[0]);
          const endMinute = parseInt(scheduleForHour.end.split(':')[1]);
          
          const startTotalMinutes = startHour * 60 + startMinute;
          const endTotalMinutes = endHour * 60 + endMinute;
          const currentHourStart = hour * 60;
          const currentHourEnd = (hour + 1) * 60;
          
          // 현재 시간대에서 실제 근무하는 분 계산
          const workingStartMinutes = Math.max(startTotalMinutes, currentHourStart);
          const workingEndMinutes = Math.min(endTotalMinutes, currentHourEnd);
          const workingMinutes = workingEndMinutes - workingStartMinutes;
          
          // 근무 비율 계산 (0~1)
          const workingRatio = workingMinutes / 60;

          return {
            isWorking: workingRatio > 0,
            workingRatio: Math.round(workingRatio * 100) / 100, // 소수점 둘째 자리까지 반올림
            shift: `${scheduleForHour.start}-${scheduleForHour.end}`,
            approved: scheduleForHour.approved || false
          };
        }

        return {
          isWorking: false,
          workingRatio: 0,
          shift: null,
          approved: false
        };
      });

      return {
        userId: userId,
        name: user.name,
        position: user.position,
        corp: user.corp,
        eid: user.eid,
        category: user.category,
        userType: Array.isArray(user.userType) ? user.userType.join(', ') : (user.userType || 'Employee'),
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