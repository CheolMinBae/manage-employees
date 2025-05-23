// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@libs/mongodb';
import SignupUser from '@models/SignupUser';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const {
      name,
      email,
      password,
      position,   // 'admin' | 'employee'
      userType,   // 'barista' | 'supervisor' | 'position1' | 'position2'
      corp,       // 'corp1' | 'corp2' | 'corp3'
      eid,
      category,
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

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성 및 저장
    const newUser = new SignupUser({
      name,
      email,
      password: hashedPassword,
      position,    // 저장: employee or admin
      userType,    // 저장: barista, supervisor, ...
      corp,        // 저장: corp1, ...
      eid,
      category,
      status: 'approved',
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
