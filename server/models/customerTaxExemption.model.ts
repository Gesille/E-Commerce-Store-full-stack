// models/customerTaxExemption.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ICustomerTaxExemption extends Document {
  odooPartnerId: number;
  exempt: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerTaxExemptionSchema = new Schema<ICustomerTaxExemption>(
  {
    odooPartnerId: { type: Number, required: true, unique: true, index: true },
    exempt: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model<ICustomerTaxExemption>(
  "CustomerTaxExemption",
  CustomerTaxExemptionSchema,
);