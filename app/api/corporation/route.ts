// 2025.12.18-code updated. 
import { NextResponse } from 'next/server';
import { connectDB } from '@libs/mongodb';
import Corporation from '@models/Corporation';

export const dynamic = 'force-dynamic';

/**
 * GET: 모든 법인 조회
 */
export async function GET() {
  try {
    await connectDB();
    const corporations = await Corporation.find({});
    return NextResponse.json(corporations, { status: 200 });
  } catch (error: any) {
    console.error('Failed to fetch corporations:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
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
      return NextResponse.json(
        { message: 'Name is required.' },
        { status: 400 }
      );
    }

    await connectDB();

    // 이름 중복 검사
    const existingCorp = await Corporation.findOne({ name });
    if (existingCorp) {
      return NextResponse.json(
        { message: 'Corporation name already exists.' },
        { status: 409 }
      );
    }

    const newCorporation = new Corporation({
      name,
      description,

      // ✅ 회사별 영업시간 (없으면 schema default 적용)
      businessDayStartHour,
      businessDayEndHour,
    });

    await newCorporation.save();

    return NextResponse.json(newCorporation, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create corporation:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT: 법인 정보 업데이트
 * - 영업시간 수정 가능
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
      return NextResponse.json(
        { message: 'ID and name are required.' },
        { status: 400 }
      );
    }

    await connectDB();

    // 이름 중복 검사 (자기 자신 제외)
    const existingCorp = await Corporation.findOne({
      name,
      _id: { $ne: _id },
    });
    if (existingCorp) {
      return NextResponse.json(
        { message: 'Corporation name already exists.' },
        { status: 409 }
      );
    }

    const updatedCorporation = await Corporation.findByIdAndUpdate(
      _id,
      {
        name,
        description,

        // ✅ 영업시간 업데이트
        businessDayStartHour,
        businessDayEndHour,
      },
      { new: true }
    );

    if (!updatedCorporation) {
      return NextResponse.json(
        { message: 'Corporation not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedCorporation, { status: 200 });
  } catch (error: any) {
    console.error('Failed to update corporation:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 법인 삭제
 */
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

    const deletedCorporation = await Corporation.findByIdAndDelete(_id);

    if (!deletedCorporation) {
      return NextResponse.json(
        { message: 'Corporation not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Corporation deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Failed to delete corporation:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}
