import { NextResponse } from 'next/server';
import dbConnect from '@libs/db';
import SignupUser from '@models/SignupUser';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required.' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await SignupUser.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: 'User not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        isFirstLogin: user.isFirstLogin !== false,
        hasDefaultPassword: user.password === '1q2w3e4r'
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Failed to check first login status:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required.' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await SignupUser.findOneAndUpdate(
      { email },
      { isFirstLogin: false },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { message: 'User not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'First login flag cleared.' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Failed to update first login status:', error);
    return NextResponse.json(
      { message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}
