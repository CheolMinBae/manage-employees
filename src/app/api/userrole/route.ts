import { NextResponse } from 'next/server';
import { connectDB } from '@libs/mongodb';
import UserRole from '@models/UserRole';

// GET: 모든 사용자 역할 조회
export async function GET() {
  try {
    await connectDB();
    const userRoles = await UserRole.find({});
    return NextResponse.json(userRoles, { status: 200 });
  } catch (error: any) {
    console.error('Failed to fetch user roles:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

// POST: 새로운 사용자 역할 생성
export async function POST(req: Request) {
  try {
    const { key, name, description } = await req.json();

    if (!key || !name) {
      return NextResponse.json(
        { message: 'Key and name are required.' },
        { status: 400 }
      );
    }

    await connectDB();

    // key 중복 검사
    const existingRole = await UserRole.findOne({ key });
    if (existingRole) {
      return NextResponse.json(
        { message: 'Role key already exists.' },
        { status: 409 }
      );
    }

    const newUserRole = new UserRole({
      key,
      name,
      description,
    });

    await newUserRole.save();

    return NextResponse.json(newUserRole, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create user role:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

// PUT: 사용자 역할 정보 업데이트
export async function PUT(req: Request) {
  try {
    const { _id, key, name, description } = await req.json();

    if (!_id || !key || !name) {
      return NextResponse.json(
        { message: 'ID, key, and name are required.' },
        { status: 400 }
      );
    }

    await connectDB();

    // key 중복 검사 (자기 자신 제외)
    const existingRole = await UserRole.findOne({ key, _id: { $ne: _id } });
    if (existingRole) {
      return NextResponse.json(
        { message: 'Role key already exists.' },
        { status: 409 }
      );
    }

    const updatedUserRole = await UserRole.findByIdAndUpdate(
      _id,
      { key, name, description },
      { new: true }
    );

    if (!updatedUserRole) {
      return NextResponse.json(
        { message: 'User role not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedUserRole, { status: 200 });
  } catch (error: any) {
    console.error('Failed to update user role:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE: 사용자 역할 삭제
export async function DELETE(req: Request) {
  try {
    const { _id } = await req.json();

    if (!_id) {
      return NextResponse.json(
        { message: 'ID is required.' },
        { status: 400 }
      );
    }

    await connectDB();

    const deletedUserRole = await UserRole.findByIdAndDelete(_id);

    if (!deletedUserRole) {
      return NextResponse.json(
        { message: 'User role not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'User role deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Failed to delete user role:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
} 