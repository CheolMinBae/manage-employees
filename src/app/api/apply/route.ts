import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

function makeWeeklyTable(weekly: { from?: string; to?: string }[]) {
  const weekDays = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];
  return weekDays.map((day, idx) => {
    const from = weekly[idx]?.from || '';
    const to = weekly[idx]?.to || '';
    return `${day}: ${from && to ? `${from} – ${to}` : ''}`;
  }).join('<br/>');
}

export async function POST(req: Request) {
  try {
    const { name, email, phone, position, startDate, weekly } = await req.json();

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration is missing. Please check your environment variables.');
    }

    // 이메일 본문 생성
    const html = `
      <p>Dear Hiring Manager,</p>
      <p>I am writing to formally express my interest in joining Seed and Water Bakery Cafe.</p>
      <p><b>Position Applied:</b> ${position}</p>
      <p><b>Earliest Start Date:</b> ${startDate}</p>
      <p><b>Name:</b> ${name}<br/>
      <b>Email:</b> ${email}<br/>
      <b>Phone:</b> ${phone}</p>
      <p><b>Weekly Availability:</b><br/>
      ${makeWeeklyTable(weekly)}
      </p>
      <p>Please find my resume attached for your review. I look forward to the opportunity to contribute to your team.</p>
      <p>Warm regards</p>
    `;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'hello@tigersplus.com',
      subject: 'New Job Application',
      html,
    };

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