import { NextResponse } from 'next/server';
import { connectDB } from '@libs/mongodb';
import SignupUser from '@models/SignupUser';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { name, email, password, position } = await req.json();

    if (!name || !email || !password || !position) {
      return NextResponse.json({ message: '모든 필드를 입력하세요.' }, { status: 400 });
    }

    await connectDB();

    // 중복 확인
    const existingUser = await SignupUser.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: '이미 가입된 이메일입니다.' }, { status: 409 });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new SignupUser({
      name,
      email,
      password: hashedPassword,
      position,
      status: 'approved',
    });

    await newUser.save();

    return NextResponse.json({ message: '회원가입 완료' }, { status: 201 });
  } catch (error: any) {
    console.error('회원가입 실패:', error);
    return NextResponse.json(
      { message: '서버 에러: ' + error.message },
      { status: 500 }
    );
  }
}
