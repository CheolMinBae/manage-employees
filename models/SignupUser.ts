import mongoose from 'mongoose';

export interface ISignupUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  position: 'employee' | 'admin';
  status: string;
  corp?: string;
  eid?: string;
  category?: string;
  userType?: string[];
  isFirstLogin?: boolean;
  managedCorps?: string[]; // 관리 가능한 매장 목록 (admin용)
  permissions?: string[]; // 개별 사용자 권한 (역할 권한 외 추가 권한)
}

const signupUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  position: { type: String, required: true, enum: ['employee', 'admin'] },
  status: { type: String, default: 'pending' },
  corp: { type: String },
  eid: { type: String },
  userType: { type: [String] },
  category: { type: String },
  isFirstLogin: { type: Boolean, default: true },
  managedCorps: { type: [String], default: [] }, // 관리 가능한 매장 목록
  permissions: { type: [String], default: [] }, // 개별 권한
}, { timestamps: true });

const SignupUser =
  mongoose.models?.SignupUser || mongoose.model('SignupUser', signupUserSchema);

export default SignupUser;
