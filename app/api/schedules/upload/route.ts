import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import Schedule from '@models/Schedule';
import SignupUser from '@models/SignupUser';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

interface UploadRow {
  corp: string;
  eid: string;
  date: string;    // YYYY-MM-DD
  start: string;   // HH:mm
  end: string;     // HH:mm
  userType?: string;
}

interface UploadResult {
  success: number;
  updated: number;
  failed: number;
  errors: string[];
}

/**
 * POST: 엑셀 파일로 스케줄 일괄 등록
 * - corp/eid로 대소문자 무관 사용자 매칭
 * - 같은 userId + date + start 존재 시 업데이트 (upsert)
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 엑셀 파일 파싱
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ error: 'Empty spreadsheet' }, { status: 400 });
    }

    // 헤더 정규화 (대소문자 무관)
    const rows: UploadRow[] = rawData.map((row: any) => {
      const normalized: any = {};
      Object.keys(row).forEach(key => {
        normalized[key.toLowerCase().trim()] = String(row[key]).trim();
      });

      return {
        corp: normalized.corp || normalized.corporation || '',
        eid: normalized.eid || normalized.empid || normalized.employeeid || normalized['employee id'] || '',
        date: normalizeDate(normalized.date || ''),
        start: normalizeTime(normalized.start || normalized.starttime || normalized['start time'] || ''),
        end: normalizeTime(normalized.end || normalized.endtime || normalized['end time'] || ''),
        userType: normalized.usertype || normalized['user type'] || normalized.position || '',
      };
    });

    // 모든 사용자 조회 (대소문자 무관 매칭용)
    const allUsers = await SignupUser.find({ status: { $ne: 'deleted' } })
      .select('_id corp eid name userType')
      .lean();

    // corp+eid 기반 사용자 매핑 (대소문자 무관)
    const userLookup = new Map<string, any>();
    allUsers.forEach((user: any) => {
      const key = `${(user.corp || '').toLowerCase()}|${(user.eid || '').toLowerCase()}`;
      userLookup.set(key, user);
    });

    const result: UploadResult = { success: 0, updated: 0, failed: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 엑셀은 1-indexed + 헤더

      // 필수 필드 검증
      if (!row.corp || !row.eid || !row.date || !row.start || !row.end) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Missing required fields (corp=${row.corp}, eid=${row.eid}, date=${row.date}, start=${row.start}, end=${row.end})`);
        continue;
      }

      // 날짜 형식 검증
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Invalid date format "${row.date}" (expected YYYY-MM-DD)`);
        continue;
      }

      // 시간 형식 검증
      if (!/^\d{2}:\d{2}$/.test(row.start) || !/^\d{2}:\d{2}$/.test(row.end)) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: Invalid time format (start=${row.start}, end=${row.end})`);
        continue;
      }

      // 사용자 찾기 (대소문자 무관)
      const lookupKey = `${row.corp.toLowerCase()}|${row.eid.toLowerCase()}`;
      const user = userLookup.get(lookupKey);

      if (!user) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: User not found (corp=${row.corp}, eid=${row.eid})`);
        continue;
      }

      const userId = user._id.toString();
      const userType = row.userType || (Array.isArray(user.userType) ? user.userType[0] : user.userType) || 'Barista';

      try {
        // 중복 체크: 같은 userId + date + start가 있으면 업데이트
        const existing = await Schedule.findOne({
          userId,
          date: row.date,
          start: row.start,
        });

        if (existing) {
          await Schedule.findByIdAndUpdate(existing._id, {
            end: row.end,
            userType,
          });
          result.updated++;
        } else {
          await Schedule.create({
            userId,
            date: row.date,
            start: row.start,
            end: row.end,
            userType,
            approved: false,
          });
          result.success++;
        }
      } catch (err: any) {
        result.failed++;
        result.errors.push(`Row ${rowNum}: ${err.message || 'Database error'}`);
      }
    }

    return NextResponse.json({
      message: `Processed ${rows.length} rows`,
      totalRows: rows.length,
      ...result,
    });
  } catch (error: any) {
    console.error('Error uploading schedules:', error);
    return NextResponse.json(
      { error: 'Failed to upload schedules', message: error.message },
      { status: 500 }
    );
  }
}

// 날짜 정규화: 다양한 형식 → YYYY-MM-DD
function normalizeDate(value: string): string {
  if (!value) return '';

  // 이미 YYYY-MM-DD 형식
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  // MM/DD/YYYY 형식
  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // 엑셀 시리얼 날짜 (숫자)
  const num = Number(value);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return value;
}

// 시간 정규화: 다양한 형식 → HH:mm
function normalizeTime(value: string): string {
  if (!value) return '';

  // 이미 HH:mm 형식
  if (/^\d{2}:\d{2}$/.test(value)) return value;

  // H:mm 형식
  const shortMatch = value.match(/^(\d{1}):(\d{2})$/);
  if (shortMatch) {
    return `${shortMatch[1].padStart(2, '0')}:${shortMatch[2]}`;
  }

  // 엑셀 소수 시간 (0.75 = 18:00)
  const num = Number(value);
  if (!isNaN(num) && num >= 0 && num < 1) {
    const totalMinutes = Math.round(num * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  return value;
}
