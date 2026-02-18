import { NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import UserRole from '@models/UserRole';
import { apiError, apiServerError } from '@libs/api-response';

export const dynamic = 'force-dynamic';

// GET: 모든 사용자 역할 조회
export async function GET() {
  try {
    await dbConnect();
    const userRoles = await UserRole.find({});
    return NextResponse.json(userRoles, { status: 200 });
  } catch (error) {
    return apiServerError('Failed to fetch user roles', error);
  }
}

// POST: 새로운 사용자 역할 생성
export async function POST(req: Request) {
  try {
    const { key, name, description } = await req.json();

    if (!key || !name) {
      return apiError('Key and name are required.');
    }

    await dbConnect();

    // key 중복 검사
    const existingRole = await UserRole.findOne({ key });
    if (existingRole) {
      return apiError('Role key already exists.', 409);
    }

    const newUserRole = new UserRole({
      key,
      name,
      description,
    });

    await newUserRole.save();

    return NextResponse.json(newUserRole, { status: 201 });
  } catch (error) {
    return apiServerError('Failed to create user role', error);
  }
}

// PUT: 사용자 역할 정보 업데이트
export async function PUT(req: Request) {
  try {
    const { _id, key, name, description } = await req.json();

    if (!_id || !key || !name) {
      return apiError('ID, key, and name are required.');
    }

    await dbConnect();

    // key 중복 검사 (자기 자신 제외)
    const existingRole = await UserRole.findOne({ key, _id: { $ne: _id } });
    if (existingRole) {
      return apiError('Role key already exists.', 409);
    }

    const updatedUserRole = await UserRole.findByIdAndUpdate(
      _id,
      { key, name, description },
      { new: true }
    );

    if (!updatedUserRole) {
      return apiError('User role not found.', 404);
    }

    return NextResponse.json(updatedUserRole, { status: 200 });
  } catch (error) {
    return apiServerError('Failed to update user role', error);
  }
}

// DELETE: 사용자 역할 삭제
export async function DELETE(req: Request) {
  try {
    const { _id } = await req.json();

    if (!_id) {
      return apiError('ID is required.');
    }

    await dbConnect();

    const deletedUserRole = await UserRole.findByIdAndDelete(_id);

    if (!deletedUserRole) {
      return apiError('User role not found.', 404);
    }

    return NextResponse.json(
      { message: 'User role deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return apiServerError('Failed to delete user role', error);
  }
}
