import { ProjectAssignment, IProjectAssignment } from '../modules/ProjectAssignment';
import mongoose from 'mongoose';

export interface AssignUsersData {
  userIds: string[];
  projectId: string;
  assignedBy: string;
}

export class ProjectAssignmentService {
  /**
   * Assign multiple users to a project in batch
   * Creates ProjectAssignment documents for each user
   * Handles duplicate assignments gracefully by catching unique constraint errors
   * 
   * Requirements: 3.1, 3.4
   */
  async assignUsersToProject(data: AssignUsersData): Promise<IProjectAssignment[]> {
    const { userIds, projectId, assignedBy } = data;
    const assignments: IProjectAssignment[] = [];
    const projectObjectId = new mongoose.Types.ObjectId(projectId);
    const assignedByObjectId = new mongoose.Types.ObjectId(assignedBy);

    // Process each user ID
    for (const userId of userIds) {
      try {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        
        const assignment = new ProjectAssignment({
          user_id: userObjectId,
          project_id: projectObjectId,
          assigned_at: new Date(),
          assigned_by: assignedByObjectId
        });

        await assignment.save();
        assignments.push(assignment);
      } catch (error: any) {
        // Handle duplicate assignment gracefully (unique index violation)
        if (error.code === 11000) {
          // User is already assigned to this project, skip silently
          // Find the existing assignment and add it to results
          const existingAssignment = await ProjectAssignment.findOne({
            user_id: new mongoose.Types.ObjectId(userId),
            project_id: projectObjectId
          });
          if (existingAssignment) {
            assignments.push(existingAssignment);
          }
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }

    return assignments;
  }

  /**
   * Remove a user's assignment from a project
   * 
   * Requirements: 3.9
   */
  async removeUserAssignment(userId: string, projectId: string): Promise<boolean> {
    const result = await ProjectAssignment.deleteOne({
      user_id: new mongoose.Types.ObjectId(userId),
      project_id: new mongoose.Types.ObjectId(projectId)
    });

    return result.deletedCount > 0;
  }

  /**
   * Get all projects assigned to a specific user
   * Returns array of project IDs
   * 
   * Requirements: 3.1
   */
  async getUserProjects(userId: string): Promise<mongoose.Types.ObjectId[]> {
    const assignments = await ProjectAssignment.find({
      user_id: new mongoose.Types.ObjectId(userId)
    });

    return assignments.map(assignment => assignment.project_id);
  }

  /**
   * Get all users assigned to a specific project
   * Returns array of user IDs
   * 
   * Requirements: 3.1
   */
  async getProjectUsers(projectId: string): Promise<mongoose.Types.ObjectId[]> {
    const assignments = await ProjectAssignment.find({
      project_id: new mongoose.Types.ObjectId(projectId)
    });

    return assignments.map(assignment => assignment.user_id);
  }
}

export const projectAssignmentService = new ProjectAssignmentService();
