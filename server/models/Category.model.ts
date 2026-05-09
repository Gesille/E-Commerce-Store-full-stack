import mongoose, { Schema, Document, Model } from "mongoose";

// Define the interface for the Category document
export interface ICategory extends Document {
  catTitle: string;
  catDesc: string;
  createdAt?: Date; // Optional: managed by Mongoose
  updatedAt?: Date; // Optional: managed by Mongoose
  odooCategoryId?: number;
}

// Define the schema for the Category model
const CategorySchema: Schema<ICategory> = new Schema(
  {
    catTitle: {
      type: String,
      required: true,
    },
    catDesc: {
      type: String,
      required: true,
    },
    odooCategoryId:{
      type:Number,
      
    }
  },
  { timestamps: true }
);

// Export the Category model with types
const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
