import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

export interface ICorporation {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  businessDayStartHour?: number;
  businessDayEndHour?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const corporationSchema = new Schema<ICorporation>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    businessDayStartHour: { type: Number, default: 8 },
    businessDayEndHour: { type: Number, default: 24 },
  },
  {
    timestamps: true,
  }
);

const Corporation =
  models?.Corporation || model<ICorporation>('Corporation', corporationSchema);

export default Corporation;
