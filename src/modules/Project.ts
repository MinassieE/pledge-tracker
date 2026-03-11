import mongoose, { Schema, Model } from 'mongoose';

export interface IProject {
  name: string;
  description?: string;
  start_date: Date;
  status: 'active' | 'inactive' | 'closed';
  total_promised_amount: number;
  total_collected_amount: number;
  created_at: Date;
  updated_at: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    description: { type: String, required: false },
    start_date: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'closed'],
      default: 'active',
      required: true
    },
    total_promised_amount: { type: Number, default: 0, required: true },
    total_collected_amount: { type: Number, default: 0, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Create indexes for status and created_at fields
projectSchema.index({ status: 1 });
projectSchema.index({ created_at: -1 });

export const Project: Model<IProject> = mongoose.model<IProject>('Project', projectSchema);
