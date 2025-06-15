import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { name, age, email, phone } = await req.json();

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration is missing. Please check your environment variables.');
    }

    // 이메일 전송을 위한 transporter 설정
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 이메일 내용 구성
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'cjfals0904@gmail.com',
      subject: 'New Job Application',
      html: `
        <h2>New Job Application</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Age:</strong> ${age}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
      `,
    };

    // 이메일 전송
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'Application submitted successfully' });
  } catch (error: any) {
    console.error('Failed to send application:', error);
    return NextResponse.json(
      { 
        error: 'Failed to submit application',
        details: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 