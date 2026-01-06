import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

// 권한 목록 정의
export const PERMISSIONS = {
  // 스케줄 관련
  SCHEDULE_VIEW: 'schedule:view',
  SCHEDULE_CREATE: 'schedule:create',
  SCHEDULE_EDIT: 'schedule:edit',
  SCHEDULE_DELETE: 'schedule:delete',
  SCHEDULE_APPROVE: 'schedule:approve',
  
  // 직원 관련
  EMPLOYEE_VIEW: 'employee:view',
  EMPLOYEE_CREATE: 'employee:create',
  EMPLOYEE_EDIT: 'employee:edit',
  EMPLOYEE_DELETE: 'employee:delete',
  
  // 설정 관련
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  
  // 리포트 관련
  REPORT_VIEW: 'report:view',
  REPORT_DOWNLOAD: 'report:download',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export interface IUserRole {
  _id: mongoose.Types.ObjectId;
  key: string; // 예: 'admin', 'employee', 'manager'
  name: string; // 예: '관리자', '직원'
  description?: string;
  permissions?: string[]; // 권한 목록
  category?: string; // 연결된 카테고리 (예: Full-time, Part-time)
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
    permissions: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const UserRole = models?.UserRole || model<IUserRole>('UserRole', userRoleSchema);

export default UserRole;
