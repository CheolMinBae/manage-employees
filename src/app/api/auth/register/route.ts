// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@libs/mongodb';
import SignupUser from '@models/SignupUser';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const {
      name,
      email,
      password,
      position,   // 'admin' | 'employee'
      userType,   // 'barista' | 'supervisor' | 'position1' | 'position2' 또는 배열
      corp,       // 'corp1' | 'corp2' | 'corp3'
      eid,
      category,
      isFirstLogin, // register 페이지에서 전달되는 값
    } = await req.json();

    // 필수 필드 유효성 검사
    if (!name || !email || !password || !position || !userType || !corp) {
      return NextResponse.json(
        { message: 'Please fill in all required fields.' },
        { status: 400 }
      );
    }

    await connectDB();

    // 이메일 중복 검사
    const existingUser = await SignupUser.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Email already exists.' },
        { status: 409 }
      );
    }

    // 비밀번호 암호화 (Google OAuth 사용자는 특별 처리)
    let processedPassword;
    if (password === 'google-oauth') {
      // Google OAuth 사용자는 랜던 패스워드 생성 (사용되지 않음)
      processedPassword = await bcrypt.hash(Math.random().toString(36), 10);
    } else {
      processedPassword = await bcrypt.hash(password, 10);
    }

    // 사용자 생성 및 저장
    const newUser = new SignupUser({
      name,
      email,
      password: processedPassword,
      position,    // 저장: employee or admin
      userType: Array.isArray(userType) ? userType : [userType],    // 저장: barista, supervisor, ... (배열로 변환)
      corp,        // 저장: corp1, ...
      eid,
      category,
      status: 'approved',
      isFirstLogin: isFirstLogin !== undefined ? isFirstLogin : false, // register를 통한 가입은 기본적으로 false
    });

    await newUser.save();

    return NextResponse.json({ message: 'Registration successful' }, { status: 201 });
  } catch (error: any) {
    console.error('Registration failed:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}
