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

interface UserDocument {
  _id: Types.ObjectId;
  name: string;
  position?: string;
  corp?: string;
  eid?: string | number;
  category?: string;
  userType?: string;
}

interface RawUserDocument {
  _id: Types.ObjectId;
  name: string;
  position?: string;
  corp?: string;
  eid?: string | number;
  category?: string;
  userType?: string;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const weekStartParam = searchParams.get('weekStart');
    if (!weekStartParam) {
      return NextResponse.json(
        { error: 'Missing weekStart parameter' },
        { status: 400 }
      );
    }

    // date-fns를 사용하여 메인 API와 동일한 주간 날짜 생성
    const weekStartDate = parseISO(weekStartParam);
    const actualWeekStart = startOfWeek(weekStartDate, WEEK_OPTIONS);
    const weekEnd = endOfWeek(weekStartDate, WEEK_OPTIONS);

    // 주간의 모든 날짜 생성 (일요일부터 토요일까지)
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(actualWeekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(formatDate(d, 'yyyy-MM-dd'));
    }


    // dayjs 객체로 변환 (타임존 변환으로 인한 날짜 변경 방지)
    const dates = weekDates.map(dateStr => dayjs(dateStr)); // 타임존 적용하지 않음

    // 이미 올바른 순서(일요일부터 토요일)로 생성되었으므로 추가 정렬 불필요

    const usersRaw = await SignupUser.find({ 
      position: { $ne: 'admin' },
      name: { $not: /testman/i } // 'testman'이 포함된 이름 제외 (대소문자 무시)
    })
      .select('_id name position corp eid category userType')
      .sort({ name: 1 })
      .lean<RawUserDocument[]>();

    // 타입 안전성을 위해 필요한 필드만 매핑
    const users: UserDocument[] = usersRaw.map(user => ({
      _id: user._id,
      name: user.name,
      position: user.position,
      corp: user.corp,
      eid: user.eid,
      category: user.category,
      userType: user.userType
    }));

    const schedules = await Schedule.find({
      date: { $in: weekDates },
      approved: true
    }).lean();

    // 새 워크북 생성
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Weekly Schedule');

    // 기본 스타일 설정
    worksheet.properties.defaultRowHeight = 80;
    worksheet.properties.defaultColWidth = 15;

    // 열 너비 설정
    worksheet.columns = [
      { header: 'Corp', width: 15 },
      { header: 'EID', width: 10 },
      { header: 'Name', width: 20 },
      { header: 'Category', width: 15 },
      { header: 'Position', width: 15 },
      ...dates.map(() => ({ width: 15 }))
    ];

    // 헤더 행 추가
    worksheet.mergeCells('A1:L1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = '근무스케줄';
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    titleCell.font = {
      name: 'Arial',
      size: 12,
      bold: true
    };

    // 날짜 헤더 행
    const dateRow = worksheet.getRow(2);
    dates.forEach((date, index) => {
      const cell = dateRow.getCell(index + 6);
      // 직접 문자열에서 날짜 포맷팅
      const dateStr = weekDates[index]; // 원본 문자열 사용
      const dateObj = new Date(dateStr + 'T00:00:00'); // 로컬 시간으로 파싱
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
      cell.value = `${day.toString().padStart(2, '0')}.${month}`;
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.font = {
        name: 'Arial',
        size: 10
      };
    });

    // 요일 헤더 행
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayRow = worksheet.getRow(3);
    dayNames.forEach((day, index) => {
      const cell = dayRow.getCell(index + 6);
      cell.value = day;
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.font = {
        name: 'Arial',
        size: 10,
        bold: true
      };
    });

    // 기본 헤더 스타일 적용
    const headerRow = worksheet.getRow(3);
    headerRow.values = ['Corp', 'EID', 'Name', 'Category', 'Position', ...dayNames];
    headerRow.font = {
      name: 'Arial',
      size: 10,
      bold: true
    };
    headerRow.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Name 헤더 셀 특별 강조
    const nameHeaderCell = headerRow.getCell(3);
    nameHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4E6F1' } // 연한 파란색 배경
    };

    // 데이터 행 추가
    users.forEach((user, index) => {
      const row = worksheet.getRow(index + 4);
      
      // 기본 정보 설정
      const corpCell = row.getCell(1);
      corpCell.value = user.corp || '';
      corpCell.alignment = { horizontal: 'center', vertical: 'middle' };
      corpCell.font = { name: 'Arial', size: 10 };

      const eidCell = row.getCell(2);
      eidCell.value = user.eid || '';
      eidCell.alignment = { horizontal: 'center', vertical: 'middle' };
      eidCell.font = { name: 'Arial', size: 10 };

      const nameCell = row.getCell(3);
      nameCell.value = user.name;
      nameCell.alignment = { horizontal: 'center', vertical: 'middle' };
      nameCell.font = { name: 'Arial', size: 10, bold: true };
      nameCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F8FF' } // 매우 연한 파란색 배경
      };

      const categoryCell = row.getCell(4);
      categoryCell.value = user.category || '';
      categoryCell.alignment = { horizontal: 'center', vertical: 'middle' };
      categoryCell.font = { name: 'Arial', size: 10 };

      const positionCell = row.getCell(5);
      positionCell.value = user.userType || user.position || '';
      positionCell.alignment = { horizontal: 'center', vertical: 'middle' };
      positionCell.font = { name: 'Arial', size: 10 };

      // 각 날짜별 스케줄 설정 (스케줄 셀에만 특별한 처리)
      dates.forEach((date, dayIndex) => {
        const dateStr = weekDates[dayIndex]; // 원본 문자열 사용
        const daySchedules = schedules.filter(
          s => s.userId.toString() === user._id.toString() && 
          s.date === dateStr
        );

        const cell = row.getCell(dayIndex + 6);
        
        if (daySchedules.length === 0) {
          // OFF인 경우
          cell.value = 'OFF';
          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle'
          };
        } else {
          // 스케줄이 있는 경우 - 여러 방법으로 개행 처리 시도
          const scheduleItems = daySchedules
            .sort((a, b) => a.start.localeCompare(b.start))
            .map(s => `${s.start}–${s.end}`);

          if (scheduleItems.length === 1) {
            // 스케줄이 하나인 경우 일반 텍스트
            cell.value = scheduleItems[0];
          } else {
            // 여러 스케줄이 있는 경우 - 다양한 방법으로 시도
            // 방법 1: Windows 스타일 개행 문자 사용 (\r\n)
            const scheduleText = scheduleItems.join('\r\n');
            cell.value = scheduleText;
            
            // 방법 2: 추가적으로 수동으로 개행 설정
            cell.alignment = {
              horizontal: 'center',
              vertical: 'middle',
              wrapText: true,
              shrinkToFit: false
            };
            
            // 방법 3: 행 높이를 더 크게 설정하여 개행이 보이도록
            if (scheduleItems.length > 1) {
              row.height = Math.max(80, scheduleItems.length * 25);
            }
          }

          // 스케줄이 있는 셀에만 별도 스타일 적용하지 않음
        }
        
        cell.font = { name: 'Arial', size: 10 };
      });

      // 행 높이 설정
      row.height = 80;
    });

    // 테두리 스타일 적용
    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const }
    };

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = borderStyle;
      });
    });

    // 엑셀 파일 생성
    const buffer = await workbook.xlsx.writeBuffer();

    // 응답 헤더 설정
    const headers = new Headers();
    headers.append('Content-Disposition', `attachment; filename="weekly-schedule-${weekStartParam}.xlsx"`);
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    return new NextResponse(buffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error generating excel file:', error);
    return NextResponse.json(
      { error: 'Failed to generate excel file' },
      { status: 500 }
    );
  }
}