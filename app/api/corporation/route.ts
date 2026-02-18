import { NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import Corporation from '@models/Corporation';
import { apiError, apiServerError } from '@libs/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET: 모든 법인 조회
 */
export async function GET() {
  try {
    await dbConnect();
    const corporations = await Corporation.find({});
    return NextResponse.json(corporations, { status: 200 });
  } catch (error) {
    return apiServerError('Failed to fetch corporations', error);
  }
}

/**
 * POST: 새로운 법인 생성
 * - businessDayStartHour / businessDayEndHour 포함
 */
export async function POST(req: Request) {
  try {
    const {
      name,
      description,
      businessDayStartHour,
      businessDayEndHour,
    } = await req.json();

    if (!name) {
      return apiError('Name is required.');
    }

    await dbConnect();

    // 이름 중복 검사
    const existingCorp = await Corporation.findOne({ name });
    if (existingCorp) {
      return apiError('Corporation name already exists.', 409);
    }

    const newCorporation = new Corporation({
      name,
      description,
      businessDayStartHour,
      businessDayEndHour,
    });

    await newCorporation.save();

    return NextResponse.json(newCorporation, { status: 201 });
  } catch (error) {
    return apiServerError('Failed to create corporation', error);
  }
}

/**
 * PUT: 법인 정보 업데이트
 */
export async function PUT(req: Request) {
  try {
    const {
      _id,
      name,
      description,
      businessDayStartHour,
      businessDayEndHour,
    } = await req.json();

    if (!_id || !name) {
      return apiError('ID and name are required.');
    }

    await dbConnect();

    // 이름 중복 검사 (자기 자신 제외)
    const existingCorp = await Corporation.findOne({
      name,
      _id: { $ne: _id },
    });
    if (existingCorp) {
      return apiError('Corporation name already exists.', 409);
    }

    const updatedCorporation = await Corporation.findByIdAndUpdate(
      _id,
      {
        name,
        description,
        businessDayStartHour,
        businessDayEndHour,
      },
      { new: true }
    );

    if (!updatedCorporation) {
      return apiError('Corporation not found.', 404);
    }

    return NextResponse.json(updatedCorporation, { status: 200 });
  } catch (error) {
    return apiServerError('Failed to update corporation', error);
  }
}

/**
 * DELETE: 법인 삭제
 */
export async function DELETE(req: Request) {
  try {
    const { _id } = await req.json();

    if (!_id) {
      return apiError('ID is required.');
    }

    await dbConnect();

    const deletedCorporation = await Corporation.findByIdAndDelete(_id);

    if (!deletedCorporation) {
      return apiError('Corporation not found.', 404);
    }

    return NextResponse.json(
      { message: 'Corporation deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return apiServerError('Failed to delete corporation', error);
  }
}
