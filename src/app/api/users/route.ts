import { NextResponse } from 'next/server';
import { connectDB } from '@libs/mongodb';
import SignupUser from '@models/SignupUser';

// GET: 모든 사용자 조회
export async function GET() {
  try {
    await connectDB();
    const users = await SignupUser.find({});
    return NextResponse.json(users, { status: 200 });
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
    const { name, email, password, position, userType, corp, eid, category } = await req.json();

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
      password, // 실제 환경에서는 해시화 필요
      position,
      userType,
      corp,
      eid,
      category,
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
    const { name, email, position, userType, corp, eid, category } = await req.json();

    if (!id || !name || !email) {
      return NextResponse.json(
        { message: 'ID, name, and email are required.' },
        { status: 400 }
      );
    }

    await connectDB();

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
      { name, email, position, userType, corp, eid, category },
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

    const deletedUser = await SignupUser.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json(
        { message: 'User not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'User deleted successfully' },
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