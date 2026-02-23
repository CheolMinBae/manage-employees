export interface Schedule {
  _id: string;
  userId: string;
  userType: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string; // HH:mm
  approved: boolean;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  isLocked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  _id: string;
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
  managedCorps?: string[];
  permissions?: string[];
  hourlyRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  _id: string;
  start: string;
  end: string;
  status: 'approved' | 'pending';
}

export interface DailyShift {
  date: string;
  slots: TimeSlot[];
}

export interface UserSchedule {
  userId: string;
  name: string;
  position: string | string[];
  corp: string;
  eid: string | number;
  category: string;
  shifts: DailyShift[];
}
