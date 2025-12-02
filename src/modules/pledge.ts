import mongoose, { Schema, Model } from 'mongoose';

export interface IPaymentHistory {
  amount: number;
  method?: string;
  date: Date;
}

export interface IRemark {
  followup_id: mongoose.Types.ObjectId; // who added the remark
  comment: string;                     // the remark text
  date: Date;                          // when it was added
}

export interface IPledge {
  full_name: string;
  phone_number: string;
  alt_phone_number?: string;
  email?: string;

  promised_amount: number;
  contribution_type: 'oneTime' | 'monthly' | 'material' | 'other';
  material_type?: string;
  material_quantity?: number;
  other_description?: string;

  promised_start_date: Date;
  promised_end_date: Date;

  paper_form_image: string;

  status: 'paid' | 'notPaid' | 'partial';
  
  amount_paid: number;
  remaining_amount: number;
  percentage_paid: number;

  assigned_followup?: mongoose.Types.ObjectId;

  payment_history: IPaymentHistory[];

  monthly_installment_amount?: number;   // amount expected each month
  next_due_date?: Date;                  // when the next payment is due
  
  remarks: IRemark[]; // <-- added

  overdue: boolean;

  created_at: Date;
  updated_at: Date;
}

const paymentHistorySchema = new Schema<IPaymentHistory>({
  amount: { type: Number, required: true },
  method: { type: String },
  date: { type: Date, default: Date.now }
});

const remarkSchema = new Schema<IRemark>({
  followup_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  comment: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const pledgeSchema = new Schema<IPledge>(
  {
    full_name: { type: String, required: true },
    phone_number: { type: String, required: true },
    alt_phone_number: { type: String },
    email: { type: String },

    promised_amount: { type: Number, required: true },
    contribution_type: {
      type: String,
      enum: ['oneTime', 'monthly', 'material', 'other'],
      required: true
    },

    material_type: { type: String },
    material_quantity: { type: Number },
    other_description: { type: String },

    promised_start_date: { type: Date, required: true },
    promised_end_date: { type: Date, required: true },

    paper_form_image: { type: String, required: true },

    status: { type: String, enum: ['paid', 'notPaid', 'partial'], default: 'notPaid' },

    amount_paid: { type: Number, default: 0 },
    remaining_amount: { type: Number, default: 0 },
    percentage_paid: { type: Number, default: 0 },

    assigned_followup: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

    payment_history: [paymentHistorySchema],

    monthly_installment_amount: { type: Number },
    next_due_date: { type: Date },

    remarks: [remarkSchema], // <-- added here

    overdue: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Pledge: Model<IPledge> = mongoose.model<IPledge>('Pledge', pledgeSchema);
