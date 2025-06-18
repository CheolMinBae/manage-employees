// 주간 시작일 설정 (일요일 = 0, 월요일 = 1)
// 미국 표준: 일요일부터 토요일까지
export const WEEK_STARTS_ON = 0; // Sunday

// date-fns 옵션 객체
export const WEEK_OPTIONS = {
  weekStartsOn: WEEK_STARTS_ON as 0 | 1 | 2 | 3 | 4 | 5 | 6
};

// 캘리포니아(미국 서부) 타임존 상수
export const CALIFORNIA_TIMEZONE = 'America/Los_Angeles'; 