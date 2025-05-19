// models/Schedule.ts
import mongoose, { Schema } from 'mongoose';

const scheduleSchema = new Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  start: { type: String, required: true }, // HH:mm
  end: { type: String, required: true },   // HH:mm
  approved: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);
