import mongoose, { Schema, Model } from 'mongoose';

export interface IProjectAssignment {
  user_id: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;
  assigned_at: Date;
  assigned_by: mongoose.Types.ObjectId;
}

const projectAssignmentSchema = new Schema<IProjectAssignment>(
  {
    user_id: { 
      type: Schema.Types.ObjectId, 
      ref: 'Admin', 
      required: true 
    },
    project_id: { 
      type: Schema.Types.ObjectId, 
      ref: 'Project', 
      required: true 
    },
    assigned_at: { 
      type: Date, 
      default: Date.now, 
      required: true 
    },
    assigned_by: { 
      type: Schema.Types.ObjectId, 
      ref: 'Admin', 
      required: true 
    }
  },
  { timestamps: false }
);

// Compound unique index to prevent duplicate assignments
projectAssignmentSchema.index({ user_id: 1, project_id: 1 }, { unique: true });

// Separate indexes for query optimization
projectAssignmentSchema.index({ user_id: 1 });
projectAssignmentSchema.index({ project_id: 1 });

export const ProjectAssignment: Model<IProjectAssignment> = mongoose.model<IProjectAssignment>(
  'ProjectAssignment', 
  projectAssignmentSchema
);
