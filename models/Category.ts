import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

export interface ICategory {
  _id: mongoose.Types.ObjectId;
  key: string;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
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

const Category = models?.Category || model<ICategory>('Category', categorySchema);

export default Category;
