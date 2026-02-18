import { NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import SignupUser from '@models/SignupUser';
import Schedule from '@models/Schedule';
import bcrypt from 'bcryptjs';
import { apiError, apiServerError } from '@libs/api-response';

export const dynamic = 'force-dynamic';

// GET: 모든 사용자 조회 또는 특정 사용자 조회
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    await dbConnect();

    if (id) {
      const user = await SignupUser.findById(id);
      if (!user) {
        return apiError('User not found.', 404);
      }
      return NextResponse.json(user, { status: 200 });
    } else {
      const users = await SignupUser.find({});
      return NextResponse.json(users, { status: 200 });
    }
  } catch (error) {
    return apiServerError('Failed to fetch users', error);
  }
}

// POST: 새로운 사용자 생성
export async function POST(req: Request) {
  try {
    const { name, email, password, position, userType, corp, eid, category, managedCorps } = await req.json();

    if (!name || !email || !password) {
      return apiError('Name, email, and password are required.');
    }

    await dbConnect();

    // 이메일 중복 검사
    const existingUser = await SignupUser.findOne({ email });
    if (existingUser) {
      return apiError('Email already exists.', 409);
    }

    // 비밀번호 해싱 (bcrypt)
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new SignupUser({
      name,
      email,
      password: hashedPassword,
      position,
      userType: Array.isArray(userType) ? userType : (userType ? [userType] : []),
      corp,
      eid,
      category,
      managedCorps: Array.isArray(managedCorps) ? managedCorps : [],
      isFirstLogin: true,
    });

    await newUser.save();

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return apiServerError('Failed to create user', error);
  }
}

// PUT: 사용자 정보 업데이트
export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const { name, email, position, userType, corp, eid, category, password, managedCorps, hourlyRate } = await req.json();

    if (!id) {
      return apiError('ID is required.');
    }

    await dbConnect();

    // 패스워드만 업데이트하는 경우 (패스워드 리셋)
    if (password && !name && !email) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const updatedUser = await SignupUser.findByIdAndUpdate(
        id,
        { 
          password: hashedPassword,
          isFirstLogin: true,
        },
        { new: true }
      );

      if (!updatedUser) {
        return apiError('User not found.', 404);
      }

      return NextResponse.json(updatedUser, { status: 200 });
    }

    // hourlyRate만 업데이트하는 경우 (인라인 수정)
    if (hourlyRate !== undefined && !name && !email) {
      const updatedUser = await SignupUser.findByIdAndUpdate(
        id,
        { hourlyRate: Number(hourlyRate) },
        { new: true }
      );
      if (!updatedUser) {
        return apiError('User not found.', 404);
      }
      return NextResponse.json(updatedUser, { status: 200 });
    }

    // 일반적인 사용자 정보 업데이트
    if (!name || !email) {
      return apiError('Name and email are required.');
    }

    // 이메일 중복 검사 (자기 자신 제외)
    const existingUser = await SignupUser.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      return apiError('Email already exists.', 409);
    }

    const updateData: any = { 
      name, 
      email, 
      position, 
      userType: Array.isArray(userType) ? userType : (userType ? [userType] : []), 
      corp, 
      eid, 
      category,
      managedCorps: Array.isArray(managedCorps) ? managedCorps : [],
    };
    if (hourlyRate !== undefined) updateData.hourlyRate = Number(hourlyRate);

    const updatedUser = await SignupUser.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      return apiError('User not found.', 404);
    }

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    return apiServerError('Failed to update user', error);
  }
}

// DELETE: 사용자 삭제
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return apiError('ID is required.');
    }

    await dbConnect();

    const userToDelete = await SignupUser.findById(id);
    if (!userToDelete) {
      return apiError('User not found.', 404);
    }

    // 해당 사용자의 모든 스케줄 삭제
    await Schedule.deleteMany({ userId: id });
    await SignupUser.findByIdAndDelete(id);

    return NextResponse.json(
      { message: 'User and all associated schedules deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return apiServerError('Failed to delete user', error);
  }
}
