// models/Schedule.ts
import mongoose, { Schema } from 'mongoose';

const scheduleSchema = new Schema({
  userId: { type: String, required: true },
  userType: { type: String, required: true }, // 사용자 타입별 스케줄 분류
  date: { type: String, required: true }, // YYYY-MM-DD
  start: { type: String, required: true }, // HH:mm
  end: { type: String, required: true },   // HH:mm
  approved: { type: Boolean, default: false },
  approvedBy: { type: String, default: null }, // 승인한 사람 이름
  approvedAt: { type: Date, default: null },   // 승인 시간
}, { timestamps: true });

export default mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);
