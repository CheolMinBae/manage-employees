import { NextResponse } from 'next/server';
import { connectDB } from '@libs/mongodb';
import SignupUser from '@models/SignupUser';
import Schedule from '@models/Schedule';
import bcrypt from 'bcryptjs';


export const dynamic = 'force-dynamic';

// GET: 모든 사용자 조회 또는 특정 사용자 조회
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    await connectDB();

    if (id) {
      // 특정 사용자 조회
      const user = await SignupUser.findById(id);
      if (!user) {
        return NextResponse.json(
          { message: 'User not found.' },
          { status: 404 }
        );
      }
      return NextResponse.json(user, { status: 200 });
    } else {
      // 모든 사용자 조회
      const users = await SignupUser.find({});
      return NextResponse.json(users, { status: 200 });
    }
  } catch (error: any) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

// POST: 새로운 사용자 생성
export async function POST(req: Request) {
  try {
    const { name, email, password, position, userType, corp, eid, category, managedCorps } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required.' },
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

    const newUser = new SignupUser({
      name,
      email,
      password, // 기본 패스워드는 평문으로 저장 (최초 로그인 시 해시화됨)
      position,
      userType: Array.isArray(userType) ? userType : (userType ? [userType] : []),
      corp,
      eid,
      category,
      managedCorps: Array.isArray(managedCorps) ? managedCorps : [], // 관리 가능한 매장 목록
      isFirstLogin: true, // 새 사용자는 최초 로그인 상태
    });

    await newUser.save();

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create user:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

// PUT: 사용자 정보 업데이트
export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const { name, email, position, userType, corp, eid, category, password, managedCorps } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: 'ID is required.' },
        { status: 400 }
      );
    }

    await connectDB();

    // 패스워드만 업데이트하는 경우 (패스워드 리셋)
    if (password && !name && !email) {
      // 기본 패스워드로 리셋 (평문으로 저장하여 기존 로직과 일관성 유지)
      const updatedUser = await SignupUser.findByIdAndUpdate(
        id,
        { 
          password: password, // 평문으로 저장 (기본 패스워드)
          isFirstLogin: true  // 패스워드 변경 필요 플래그 설정
        },
        { new: true }
      );

      if (!updatedUser) {
        return NextResponse.json(
          { message: 'User not found.' },
          { status: 404 }
        );
      }

      return NextResponse.json(updatedUser, { status: 200 });
    }

    // 일반적인 사용자 정보 업데이트
    if (!name || !email) {
      return NextResponse.json(
        { message: 'Name and email are required.' },
        { status: 400 }
      );
    }

    // 이메일 중복 검사 (자기 자신 제외)
    const existingUser = await SignupUser.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Email already exists.' },
        { status: 409 }
      );
    }

    const updatedUser = await SignupUser.findByIdAndUpdate(
      id,
      { 
        name, 
        email, 
        position, 
        userType: Array.isArray(userType) ? userType : (userType ? [userType] : []), 
        corp, 
        eid, 
        category,
        managedCorps: Array.isArray(managedCorps) ? managedCorps : []
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { message: 'User not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error: any) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE: 사용자 삭제
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'ID is required.' },
        { status: 400 }
      );
    }

    await connectDB();

    // 사용자 존재 확인
    const userToDelete = await SignupUser.findById(id);
    if (!userToDelete) {
      return NextResponse.json(
        { message: 'User not found.' },
        { status: 404 }
      );
    }

    // 해당 사용자의 모든 스케줄 삭제
    await Schedule.deleteMany({ userId: id });

    // 사용자 삭제
    await SignupUser.findByIdAndDelete(id);

    return NextResponse.json(
      { message: 'User and all associated schedules deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Failed to delete user:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
} 