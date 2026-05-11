// withAuth가 wrap한 내부 미들웨어 함수와 옵션을 가로채기
jest.mock('next-auth/middleware', () => {
  const _captured: { middleware?: any; options?: any } = {}
  return {
    withAuth: (fn: any, options: any) => {
      _captured.middleware = fn
      _captured.options = options
      return fn
    },
    _captured,
  }
})

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: jest.fn((url: any) => ({ type: 'redirect', url: String(url) })),
    next: jest.fn(() => ({ type: 'next' })),
  },
}))

import { NextResponse } from 'next/server'
import middleware, { adminOnlyPaths } from '@/middleware'
import * as nextAuthMw from 'next-auth/middleware'

const captured = (nextAuthMw as any)._captured

const mkReq = (pathname: string, position?: string) => ({
  nextUrl: { pathname },
  url: `http://localhost:3000${pathname}`,
  nextauth: { token: position ? { position } : null },
}) as any

describe('middleware - 인증/권한 가드 회귀 방지', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('adminOnlyPaths', () => {
    it('contains the expected admin-only routes', () => {
      expect(adminOnlyPaths).toEqual(
        expect.arrayContaining(['/settings', '/schedule-templates', '/approve'])
      )
    })
  })

  describe('authorized callback (미인증 차단)', () => {
    it('rejects when token is null', () => {
      expect(captured.options.callbacks.authorized({ token: null })).toBe(false)
    })

    it('accepts when token exists', () => {
      expect(captured.options.callbacks.authorized({ token: { position: 'employee' } })).toBe(true)
    })
  })

  describe('admin-only routes (비-admin 차단)', () => {
    it('redirects non-admin from /settings to /', () => {
      middleware(mkReq('/settings', 'employee'))
      expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
      expect(NextResponse.next).not.toHaveBeenCalled()
    })

    it('redirects non-admin from /schedule-templates to /', () => {
      middleware(mkReq('/schedule-templates', 'employee'))
      expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
    })

    it('redirects non-admin from /approve to /', () => {
      middleware(mkReq('/approve', 'employee'))
      expect(NextResponse.redirect).toHaveBeenCalledTimes(1)
    })

    it('allows admin on /settings', () => {
      middleware(mkReq('/settings', 'admin'))
      expect(NextResponse.next).toHaveBeenCalledTimes(1)
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it('allows non-admin on non-admin routes (e.g. /schedule)', () => {
      middleware(mkReq('/schedule', 'employee'))
      expect(NextResponse.next).toHaveBeenCalledTimes(1)
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })
  })
})
