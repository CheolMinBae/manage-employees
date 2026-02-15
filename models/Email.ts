import mongoose, { Schema } from 'mongoose';

const emailSchema = new Schema({
  email: { type: String, required: true },
}, { timestamps: true });


export default mongoose.models.Email || mongoose.model('Email', emailSchema); 