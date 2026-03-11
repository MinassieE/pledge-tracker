import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPasswordReset extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const passwordResetSchema = new Schema<IPasswordReset>({
  email: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true 
  },
  otp: { 
    type: String, 
    required: true 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: { expires: 0 } // TTL index - documents auto-delete when expiresAt is reached
  },
  used: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for faster lookups
passwordResetSchema.index({ email: 1, otp: 1 });

export const PasswordReset: Model<IPasswordReset> = mongoose.model<IPasswordReset>(
  'PasswordReset', 
  passwordResetSchema
);
