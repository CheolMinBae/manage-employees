// models/Schedule.ts
import mongoose, { Schema } from 'mongoose';

const scheduleSchema = new Schema({
  userId: { type: String, required: true },
  userType: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  start: { type: String, required: true }, // HH:mm
  end: { type: String, required: true },   // HH:mm
  approved: { type: Boolean, default: false },
  approvedBy: { type: String, default: null },
  approvedAt: { type: Date, default: null },
  isLocked: { type: Boolean, default: false }, // 템플릿 강제 적용 시 시간 수정 잠금
}, { timestamps: true });

export default mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);
