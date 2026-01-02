export interface Schedule {
  id: string;
  userId: string;
  date: Date;
  start: string;
  end: string;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  position: string;
  corp: string;
  eid: string | number;
  category: string;
  createdAt: Date;
  updatedAt: Date;
} 