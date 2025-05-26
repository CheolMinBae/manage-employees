import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

export interface IUserRole {
  _id: mongoose.Types.ObjectId;
  key: string; // 예: 'admin', 'employee', 'manager'
  name: string; // 예: '관리자', '직원'
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userRoleSchema = new Schema<IUserRole>(
  {
    key: {
      type: String,
      required: true,
      unique: true, // 중복 역할 방지
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const UserRole = models?.UserRole || model<IUserRole>('UserRole', userRoleSchema);

export default UserRole;
