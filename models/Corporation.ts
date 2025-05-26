import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

export interface ICorporation {
  _id: mongoose.Types.ObjectId;
  name: string; // ex) corp1, corp2
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const corporationSchema = new Schema<ICorporation>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
  },
  {
    timestamps: true,
  }
);

const Corporation =
  models?.Corporation || model<ICorporation>('Corporation', corporationSchema);

export default Corporation;
