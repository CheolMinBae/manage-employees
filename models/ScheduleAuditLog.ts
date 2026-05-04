import mongoose, { Schema } from 'mongoose';

const scheduleAuditLogSchema = new Schema({
  scheduleId: { type: String, required: true, index: true },
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'bulk-delete', 'approve', 'unapprove'],
    index: true,
  },
  actorUserId: { type: String, default: null, index: true },
  actorName: { type: String, default: 'Unknown' },
  actorRole: { type: String, default: 'unknown' },
  targetUserId: { type: String, default: null, index: true },
  targetEmployeeName: { type: String, default: null },
  corp: { type: String, default: null, index: true },
  date: { type: String, default: null, index: true },
  before: { type: Schema.Types.Mixed, default: null },
  after: { type: Schema.Types.Mixed, default: null },
}, { timestamps: true });

export default mongoose.models.ScheduleAuditLog || mongoose.model('ScheduleAuditLog', scheduleAuditLogSchema);
