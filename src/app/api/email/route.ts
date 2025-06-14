import { NextResponse } from 'next/server';
import Email from '../../../../models/Email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    const newEmail = new Email({ email });
    await newEmail.save();
    return NextResponse.json({ message: 'Email saved successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error saving email:', error);
    return NextResponse.json({ error: 'Failed to save email' }, { status: 500 });
  }
}
