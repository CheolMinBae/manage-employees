import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import Schedule from '@models/Schedule';
import SignupUser from '@models/SignupUser';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import { startOfWeek, endOfWeek, format as formatDate, parseISO } from 'date-fns';
import { WEEK_OPTIONS } from '@/constants/dateConfig';
import ExcelJS from 'exceljs';
import { Types } from 'mongoose';

dayjs.extend(timezone);

export const dynamic = 'force-dynamic';

interface UserInfo {
  _id: string;
  name: string;
  position?: string;
  corp?: string;
  eid?: string | number;
  category?: string;
  userType?: string[];
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const weekStartParam = searchParams.get('weekStart');
    const userIdsParam = searchParams.get('userIds'); // << 추가됨

    if (!weekStartParam) {
      return NextResponse.json(
        { error: 'Missing weekStart parameter' },
        { status: 400 }
      );
    }

    // 🌟 필터된 사용자 ID 목록 (프론트에서 전달된 경우)
    let filteredUserIds: string[] = [];
    if (userIdsParam) {
      try {
        filteredUserIds = JSON.parse(userIdsParam).map((id: any) => String(id));
      } catch {
        console.error("Invalid userIds JSON");
      }
    }

    // 날짜 범위 생성
    const weekStartDate = parseISO(weekStartParam);
    const actualWeekStart = startOfWeek(weekStartDate, WEEK_OPTIONS);

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(actualWeekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(formatDate(d, 'yyyy-MM-dd'));
    }

    // 사용자 목록 로드
    const usersRaw = await SignupUser.find({
      status: { $ne: 'deleted' }
    })
      .select('_id name position corp eid category userType')
      .lean();

    const users: Record<string, UserInfo> = {};
    usersRaw.forEach((user: any) => {
      users[user._id.toString()] = {
        _id: user._id.toString(),
        name: user.name,
        position: user.position,
        corp: user.corp,
        eid: user.eid,
        category: user.category,
        userType: user.userType || []
      };
    });

    // 스케줄 읽기
    const schedules = await Schedule.find({
      date: { $in: weekDates }
    }).lean();

    // 🌟 uniqueUsers 생성 (보여진 직원만)
    let uniqueUsers: string[];

    if (filteredUserIds.length > 0) {
      // ⭐ 필터링된 유저만 포함
      uniqueUsers = filteredUserIds
        .filter((id) => users[id])
        .sort((a, b) => users[a].name.localeCompare(users[b].name));
    } else {
      // ⭐ 기존 방식: 전체 사용자 + 스케줄 있는 사람
      const scheduledUsers = Array.from(new Set(schedules.map(s => s.userId.toString())));
      const allUserIds = Object.keys(users);

      uniqueUsers = Array.from(new Set([...scheduledUsers, ...allUserIds]))
        .filter(id => users[id])
        .sort((a, b) => users[a].name.localeCompare(users[b].name));
    }

    console.log("🔥 Final uniqueUsers:", uniqueUsers);

    // --- 엑셀 생성 시작 ---

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Weekly Schedule');

    worksheet.properties.defaultRowHeight = 80;
    worksheet.properties.defaultColWidth = 15;

    worksheet.columns = [
      { header: 'Corp', width: 15 },
      { header: 'EID', width: 10 },
      { header: 'Name', width: 20 },
      { header: 'Category', width: 15 },
      { header: 'Position', width: 15 },
      ...weekDates.map(() => ({ width: 15 }))
    ];

    worksheet.mergeCells('A1:L1');
    worksheet.getCell('A1').value = '근무스케줄';
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A1').font = { name: 'Arial', size: 12, bold: true };

    // 날짜 헤더
    const dateRow = worksheet.getRow(2);
    weekDates.forEach((date, i) => {
      const d = new Date(date + "T00:00:00");
      dateRow.getCell(i + 6).value =
        `${d.getDate().toString().padStart(2, '0')}.${d.toLocaleDateString('en-US', { month: 'short' })}`;
    });

    // 요일 헤더
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayRow = worksheet.getRow(3);
    dayNames.forEach((day, i) => (dayRow.getCell(i + 6).value = day));

    const headerRow = worksheet.getRow(3);
    headerRow.values = ['Corp', 'EID', 'Name', 'Category', 'Position', ...dayNames];

    // --- 데이터 행 생성 ---
    uniqueUsers.forEach((userId, index) => {
      const user = users[userId];
      if (!user) return;

      const row = worksheet.getRow(index + 4);

      row.getCell(1).value = user.corp || '';
      row.getCell(2).value = user.eid || '';
      row.getCell(3).value = user.name;
      row.getCell(4).value = user.category || '';
      row.getCell(5).value = Array.isArray(user.userType)
        ? user.userType.join(', ')
        : String(user.userType || '');

      weekDates.forEach((dateStr, dayIndex) => {
        const daySchedules = schedules.filter(
          s => s.userId.toString() === userId && s.date === dateStr
        );

        const cell = row.getCell(dayIndex + 6);
        if (daySchedules.length === 0) {
          cell.value = 'OFF';
        } else {
          const scheduleText = daySchedules
            .sort((a, b) => a.start.localeCompare(b.start))
            .map(s => `${s.start}–${s.end}`)
            .join('\r\n');
          cell.value = scheduleText;
          cell.alignment = { wrapText: true };
        }
      });

      row.height = 80;
    });

    worksheet.eachRow((row) =>
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      })
    );

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="weekly-schedule-${weekStartParam}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });

  } catch (error) {
    console.error('Error generating excel file:', error);
    return NextResponse.json(
      { error: 'Failed to generate excel file' },
      { status: 500 }
    );
  }
}
