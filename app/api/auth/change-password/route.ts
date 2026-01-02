import { NextResponse } from 'next/server';
import { connectDB } from '@libs/mongodb';
import SignupUser from '@models/SignupUser';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, currentPassword, newPassword, isFirstLogin } = await req.json();

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        { message: 'Email, current password, and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    await connectDB();

    // 사용자 찾기
    const user = await SignupUser.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: 'User not found.' },
        { status: 404 }
      );
    }

    // 현재 비밀번호 확인
    let isCurrentPasswordValid = false;
    
    if (isFirstLogin && currentPassword === '1q2w3e4r') {
      // 최초 로그인 시 기본 비밀번호 확인
      isCurrentPasswordValid = user.password === '1q2w3e4r';
    } else {
      // 일반적인 경우 해시된 비밀번호와 비교
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        // 이미 해시된 비밀번호
        isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      } else {
        // 평문 비밀번호 (기본 비밀번호)
        isCurrentPasswordValid = user.password === currentPassword;
      }
    }

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { message: 'Current password is incorrect.' },
        { status: 401 }
      );
    }

    // 새 비밀번호 해시화
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 비밀번호 업데이트
    await SignupUser.findByIdAndUpdate(user._id, {
      password: hashedNewPassword,
      isFirstLogin: false, // 최초 로그인 플래그 해제
      updatedAt: new Date()
    });

    return NextResponse.json(
      { message: 'Password changed successfully.' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Failed to change password:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
} 