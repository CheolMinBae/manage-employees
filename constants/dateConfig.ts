import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import updateLocale from 'dayjs/plugin/updateLocale';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isBetween from 'dayjs/plugin/isBetween';

// dayjs 플러그인 등록 (한번만 호출)
dayjs.extend(weekday);
dayjs.extend(updateLocale);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

// 주간 시작일 설정 (일요일 = 0, 월요일 = 1)
// 미국 표준: 일요일부터 토요일까지
export const WEEK_STARTS_ON = 0; // Sunday

// dayjs locale 설정: 주 시작일을 일요일로
dayjs.updateLocale('en', {
  weekStart: WEEK_STARTS_ON,
});

// date-fns 호환 옵션 (기존 코드 호환용, 점진적 제거)
export const WEEK_OPTIONS = {
  weekStartsOn: WEEK_STARTS_ON as 0 | 1 | 2 | 3 | 4 | 5 | 6,
};

// 캘리포니아(미국 서부) 타임존 상수
export const CALIFORNIA_TIMEZONE = 'America/Los_Angeles';

/* =========================
   dayjs 헬퍼 함수
========================= */

/** 주어진 날짜의 주 시작일(일요일) 반환 */
export function getWeekStart(date: Date | string): dayjs.Dayjs {
  return dayjs(date).startOf('week');
}

/** 주어진 날짜의 주 종료일(토요일) 반환 */
export function getWeekEnd(date: Date | string): dayjs.Dayjs {
  return dayjs(date).endOf('week');
}

/** ISO 문자열 → dayjs 파싱 */
export function parseDate(dateStr: string): dayjs.Dayjs {
  return dayjs(dateStr);
}

/** 날짜를 포맷팅 (dayjs 포맷 패턴 사용) */
export function formatDate(date: Date | string | dayjs.Dayjs, pattern: string): string {
  return dayjs(date).format(pattern);
}

/** 날짜가 범위 내에 있는지 확인 */
export function isDateInRange(date: Date | string, start: Date | dayjs.Dayjs, end: Date | dayjs.Dayjs): boolean {
  return dayjs(date).isBetween(dayjs(start), dayjs(end), 'day', '[]');
}
