import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import Schedule from '@models/Schedule';
import SignupUser from '@models/SignupUser';
import { format } from 'date-fns';

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

    if (schedules.length === 0) {
      // 빈 시간대 데이터 반환
      const emptyHourlyData = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: 0,
        employees: []
      }));
      
      return NextResponse.json({
        date,
        hourlyData: emptyHourlyData
      });
    }

    // 사용자 정보 가져오기
    const userIds = schedules.map(s => s.userId);
    const users = await SignupUser.find({ _id: { $in: userIds } })
      .select('_id name position')
      .lean();

    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    // 시간대별 근무자 계산
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const workingEmployees: Array<{
        name: string;
        position: string;
        shift: string;
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
              shift: `${schedule.start}-${schedule.end}`
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

    return NextResponse.json({
      date,
      hourlyData
    });

  } catch (error) {
    console.error('Error fetching hourly data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hourly data' },
      { status: 500 }
    );
  }
} 