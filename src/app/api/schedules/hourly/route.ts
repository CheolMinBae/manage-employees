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
      userMapping[user._id.toString()] = {
        _id: user._id.toString(),
        name: user.name,
        position: user.position,
        corp: user.corp,
        eid: user.eid,
        category: user.category,
        userType: user.userType || []
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
              userType: user.userType.join(', ')
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
      const userId = user._id.toString();
      const userSchedules = schedules.filter(s => s.userId === userId);
      
      // 시간별 상태 계산
      const hourlyStatus = Array.from({ length: 24 }, (_, hour) => {
        const scheduleForHour = userSchedules.find(schedule => {
          const scheduleHour = new Date(schedule.start).getHours();
          const scheduleEndHour = new Date(schedule.end).getHours();
          return hour >= scheduleHour && hour < scheduleEndHour;
        });

        if (scheduleForHour) {
          const startHour = new Date(scheduleForHour.start).getHours();
          const endHour = new Date(scheduleForHour.end).getHours();
          const totalHours = endHour - startHour;
          const workingRatio = totalHours > 0 ? 1 / totalHours : 0;

          return {
            isWorking: true,
            workingRatio,
            shift: `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`,
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
        userType: user.userType || [],
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