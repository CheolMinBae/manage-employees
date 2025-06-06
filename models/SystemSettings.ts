import mongoose from 'mongoose';

const SystemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export default mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema); 