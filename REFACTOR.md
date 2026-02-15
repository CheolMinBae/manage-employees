# manage-employees 리팩토링 문서

## 프로젝트 개요

Next.js 14 (App Router) 기반 직원 스케줄 관리 시스템.
MongoDB(Mongoose) + NextAuth 인증, MUI 5 UI.

---

## 페이지 목록

| 경로 | 설명 | 접근 권한 |
|------|------|----------|
| `/` | 대시보드 (주간 스케줄 / 시간별 인원 탭) | 인증된 사용자 |
| `/schedule` | 스케줄 등록 (월 캘린더, 시프트 추가/수정) | 인증된 사용자 (본인만) |
| `/schedule-templates` | 스케줄 템플릿 관리 | 관리자 |
| `/approve` | 스케줄 승인 (사용자 목록 + 승인/반려) | 관리자 |
| `/settings` | 설정 (직원/법인/역할 관리 탭) | 관리자 |
| `/authentication/login` | 로그인 (이메일+비밀번호, Google OAuth) | 비인증 |
| `/authentication/register` | 회원가입 | 비인증 |
| `/authentication/change-password` | 비밀번호 변경 (첫 로그인 강제) | 인증된 사용자 |
| `/sample-page` | 샘플 페이지 | - |
| `/utilities/shadow` | 그림자 스타일 쇼케이스 | - |
| `/utilities/typography` | 타이포그래피 쇼케이스 | - |
| `/icons` | 아이콘 쇼케이스 | - |
| `/now` | 현재 시각 페이지 | - |

---

## API 엔드포인트

### 인증 (Auth)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/register` | 회원가입 (bcrypt 해싱) |
| POST | `/api/auth/change-password` | 비밀번호 변경 (첫 로그인 처리) |
| GET | `/api/auth/check-first-login` | 첫 로그인 여부 확인 |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth 핸들러 |

### 사용자 (Users)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/users` | 전체 사용자 조회 (id로 개별 조회 가능) |
| POST | `/api/users` | 사용자 생성 (평문 비밀번호, isFirstLogin=true) |
| PUT | `/api/users?id=` | 사용자 수정 (비밀번호만 변경 시 리셋 처리) |
| DELETE | `/api/users?id=` | 사용자 + 관련 스케줄 삭제 |

### 스케줄 (Schedules)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/schedules` | 스케줄 조회 (대시보드/필터 모드) |
| POST | `/api/schedules` | 스케줄 생성 (영업시간 검증, 충돌 체크) |
| PUT | `/api/schedules` | 스케줄 수정 (승인 처리 포함) |
| DELETE | `/api/schedules` | 스케줄 삭제 (단건/일괄) |
| GET | `/api/schedules/hourly?date=` | 시간별 인원 현황 (3AM-11PM) |
| GET | `/api/schedules/download?weekStart=` | 주간 스케줄 Excel 다운로드 |
| POST | `/api/schedules/weekly-publishable` | 주간 발행 가능 여부 확인 |

### 스케줄 템플릿 (Schedule Templates)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/schedule-templates` | 템플릿 목록 (order, name 정렬) |
| POST | `/api/schedule-templates` | 템플릿 생성 (시간 형식 검증) |
| PUT | `/api/schedule-templates` | 템플릿 수정 |
| DELETE | `/api/schedule-templates?id=` | 템플릿 삭제 |

### 기타

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET/POST/PUT/DELETE | `/api/corporation` | 법인 CRUD |
| GET | `/api/category` | 카테고리 조회 |
| GET/POST/PUT/DELETE | `/api/userrole` | 사용자 역할 CRUD |
| GET/POST/PUT | `/api/system-settings` | 시스템 설정 관리 |
| POST | `/api/email` | 이메일 저장 |
| POST | `/api/apply` | 입사 지원 (이메일 발송) |

---

## 핵심 기능

### 1. 스케줄 관리
- 시프트 생성/수정/삭제 (영업시간 범위 검증)
- 6시간 이상 시프트 자동 분할 (30분 휴식)
- 스케줄 충돌 감지
- 자정 넘김(cross-midnight) 시프트 지원
- 주간/시간별 뷰 전환

### 2. 승인 워크플로우
- pending → approved 상태 전환
- 승인자/승인시간 기록
- 세션 분리(점심 분할) 기능
- 상태별/날짜별/사용자별 필터

### 3. 직원 관리
- CRUD + 비밀번호 리셋
- 다중 userType 지원
- 법인(Corporation) 배정
- 관리자의 법인 관리 권한(managedCorps)

### 4. 인증
- NextAuth (Credentials + Google OAuth)
- JWT 전략 (30일 만료)
- 첫 로그인 시 비밀번호 강제 변경
- 역할 기반 접근 제어 (admin/employee)

### 5. 보고서
- 주간 스케줄 테이블 (승인/미승인 색상 구분)
- 시간별 인원 현황 테이블
- Excel 다운로드

---

## 모델 (Mongoose)

| 모델 | 파일 | 핵심 필드 |
|------|------|----------|
| SignupUser | `models/SignupUser.ts` | name, email, password, position(admin/employee), userType[], corp, managedCorps[], isFirstLogin |
| Schedule | `models/Schedule.ts` | userId, userType, date(YYYY-MM-DD), start(HH:mm), end(HH:mm), approved, approvedBy, approvedAt |
| ScheduleTemplate | `models/ScheduleTemplate.ts` | name(unique), displayName, startTime, endTime, isActive, order |
| Corporation | `models/Corporation.ts` | name(unique), description |
| Category | `models/Category.ts` | key(unique), name, description |
| UserRole | `models/UserRole.ts` | key(unique), name, permissions[], category |
| SystemSettings | `models/SystemSettings.ts` | key(unique), value(Mixed), description |
| Email | `models/Email.ts` | email, createdAt |

---

## 주요 컴포넌트

| 컴포넌트 | 경로 | 역할 |
|----------|------|------|
| WeeklyScheduleTable | `components/dashboard/` | 주간 스케줄 매트릭스 (직원×요일) |
| HourlyStaffingTable | `components/dashboard/` | 시간별 인원 현황 (직원×시간) |
| AddShiftDialog | `components/schedule/` | 시프트 추가 다이얼로그 |
| EditShiftDialog | `components/schedule/` | 시프트 수정 다이얼로그 |
| SimpleAddShiftDialog | `components/schedule/` | 간편 시프트 추가 |
| ApprovalDialog | `components/approve/` | 승인 다이얼로그 |
| FilterControls | `components/approve/` | 승인 필터 컨트롤 |
| EmployeeManagement | `settings/components/` | 직원 관리 탭 |
| CorporationManagement | `settings/components/` | 법인 관리 탭 |
| UserRoleManagement | `settings/components/` | 역할 관리 탭 |

---

## 유틸/라이브러리

| 파일 | 역할 |
|------|------|
| `libs/auth.ts` | NextAuth 설정 (Credentials + Google, JWT 콜백) |
| `libs/auth/requireSession.ts` | 서버사이드 세션 보호 미들웨어 |
| `libs/db.ts` | Mongoose 커넥션 (캐싱, DocumentDB 지원) |
| `libs/mongodb.ts` | MongoDB 커넥션 (SSL/TLS 설정) |
| `utils/theme/DefaultColors.tsx` | MUI 테마 (Plus Jakarta Sans, 커스텀 팔레트) |
| `utils/theme.ts` | 기본 MUI 테마 |
| `utils/createEmotionCache.ts` | Emotion CSS-in-JS 캐시 |
| `utils/test-utils.tsx` | 테스트 유틸 (목 데이터, 커스텀 렌더) |
| `constants/dateConfig.ts` | 날짜 설정 (주 시작일, 캘리포니아 타임존) |
| `types/schedule.ts` | Schedule, User 인터페이스 |

---

## 권한 모델

**PERMISSIONS (UserRole 모델):**
- 스케줄: `schedule:view`, `schedule:create`, `schedule:edit`, `schedule:delete`, `schedule:approve`
- 직원: `employee:view`, `employee:create`, `employee:edit`, `employee:delete`
- 설정: `settings:view`, `settings:edit`
- 리포트: `report:view`, `report:download`

**접근 제어:**
| 기능 | admin | employee |
|------|-------|----------|
| 대시보드 (전체) | O | O (본인만) |
| 스케줄 등록 | O | O (본인만) |
| 스케줄 승인 | O | X |
| 설정 | O | X |
| 템플릿 관리 | O | X |

---

## 기술 스택

- **프레임워크:** Next.js 14.2.3 (App Router)
- **UI:** MUI 5, Emotion, Plus Jakarta Sans
- **DB:** MongoDB/DocumentDB (Mongoose 7)
- **인증:** NextAuth 4 (JWT, Credentials, Google OAuth)
- **날짜:** dayjs, date-fns, date-fns-tz
- **Excel:** exceljs, xlsx
- **이메일:** nodemailer
- **테스트:** Jest 30, Testing Library

---

## 리팩토링 대상 (식별된 이슈)

### utils/
- `theme.ts`와 `theme/DefaultColors.tsx` 중복 (테마 설정이 2곳)
- `test-utils.tsx`에 목 데이터가 하드코딩됨
- DB 커넥션 파일 중복 (`libs/db.ts` vs `libs/mongodb.ts`)

### models/
- `SignupUser` 모델명이 실제 용도(User)와 불일치
- `Email` 모델의 createdAt 이중 정의
- 타입 정의(`types/schedule.ts`)와 모델 인터페이스 분산

### API routes/
- 일관되지 않은 에러 처리 패턴
- 일부 API에서 비밀번호를 평문 저장 (`/api/users` POST)
- `/api/schedules` GET이 너무 많은 역할 (대시보드/필터/개별 조회)
- Corporation 모델에 businessDayStartHour/EndHour가 스키마에 없지만 API에서 사용

### 컴포넌트/
- AddShiftDialog vs SimpleAddShiftDialog 중복
- 대시보드 컴포넌트에 비즈니스 로직이 과다 포함
- 샘플/유틸리티 페이지들 (shadow, typography, icons, sample-page) 정리 필요

### 기타
- Prisma 스키마가 존재하지만 사용 여부 불명확 (이중 ORM)
- 날짜 라이브러리 3개 혼용 (dayjs, date-fns, date-fns-tz)
