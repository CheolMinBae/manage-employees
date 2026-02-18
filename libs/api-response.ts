import { NextResponse } from 'next/server';

/**
 * 표준 API 에러 응답 생성 헬퍼
 * 모든 API에서 일관된 에러 응답 형식 사용
 */

// 클라이언트 에러 (400, 404, 409 등)
export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

// 서버 에러 (500) - error 객체 포함
export function apiServerError(context: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`${context}:`, error);
  return NextResponse.json(
    { error: context, message },
    { status: 500 }
  );
}

// 성공 응답
export function apiSuccess(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}
