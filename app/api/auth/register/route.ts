import { NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import SignupUser from '@models/SignupUser';
import bcrypt from 'bcryptjs';
import { apiError, apiServerError } from '@libs/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const {
      name,
      email,
      password,
      position,
      userType,
      corp,
      eid,
      category,
      isFirstLogin,
    } = await req.json();

    // 필수 필드 유효성 검사
    if (!name || !email || !password || !position || !userType || !corp) {
      return apiError('Please fill in all required fields.');
    }

    await dbConnect();

    // 이메일 중복 검사
    const existingUser = await SignupUser.findOne({ email });
    if (existingUser) {
      return apiError('Email already exists.', 409);
    }

    // 비밀번호 암호화 (Google OAuth 사용자는 특별 처리)
    let processedPassword;
    if (password === 'google-oauth') {
      processedPassword = await bcrypt.hash(Math.random().toString(36), 10);
    } else {
      processedPassword = await bcrypt.hash(password, 10);
    }

    // 사용자 생성 및 저장
    const newUser = new SignupUser({
      name,
      email,
      password: processedPassword,
      position,
      userType: Array.isArray(userType) ? userType : [userType],
      corp,
      eid,
      category,
      status: 'approved',
      isFirstLogin: isFirstLogin !== undefined ? isFirstLogin : false,
    });

    await newUser.save();

    return NextResponse.json({ message: 'Registration successful' }, { status: 201 });
  } catch (error) {
    return apiServerError('Registration failed', error);
  }
}
