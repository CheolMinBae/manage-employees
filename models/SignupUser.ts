import mongoose from 'mongoose';

const signupUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  position: { type: String, required: true, enum: ['employee', 'admin'] },
  status: { type: String, default: 'pending' },
}, { timestamps: true });

const SignupUser =
  mongoose.models?.SignupUser || mongoose.model('SignupUser', signupUserSchema);

export default SignupUser;
