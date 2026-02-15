// libs/mongodb.ts
// db.ts로 통합 - 하위 호환을 위한 re-export
import dbConnect from './db';

export const connectDB = dbConnect;
