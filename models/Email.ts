import mongoose, { Schema } from 'mongoose';

const emailSchema = new Schema({
  email: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });


export default mongoose.models.Email || mongoose.model('Email', emailSchema); 