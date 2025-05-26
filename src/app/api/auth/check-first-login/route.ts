import { NextResponse } from 'next/server';
import { connectDB } from '@libs/mongodb';
import SignupUser from '@models/SignupUser';

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

    await connectDB();

    const user = await SignupUser.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: 'User not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        isFirstLogin: user.isFirstLogin !== false, // 기본값이 true이므로 false가 아니면 true
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