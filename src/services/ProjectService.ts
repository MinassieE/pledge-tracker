import { Project, IProject } from '../modules/Project';
import { ProjectAssignment } from '../modules/ProjectAssignment';
import { Pledge } from '../modules/pledge';
import mongoose from 'mongoose';

export interface CreateProjectData {
  name: string;
  description?: string;
  start_date: Date;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'closed';
}

export class ProjectService {
  /**
   * Create a new project with default initialization
   * - status defaults to 'active'
   * - total_promised_amount defaults to 0
   * - total_collected_amount defaults to 0
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.4
   */
  async createProject(data: CreateProjectData): Promise<IProject> {
    const project = new Project({
      name: data.name,
      description: data.description,
      start_date: data.start_date,
      status: 'active',
      total_promised_amount: 0,
      total_collected_amount: 0
    });

    await project.save();
    return project;
  }

  /**
   * Get projects with role-based filtering and real-time statistics
   * - Super admins see all projects
   * - Other users see only projects they're assigned to
   * - Returns projects with calculated collection percentages
   * 
   * Requirements: 1.7, 9.1, 9.2, 9.3
   */
  async getProjects(userId: string, userRole: string): Promise<any[]> {
    let projects: any[];
    
    // Super admins see all projects
    if (userRole === 'superAdmin') {
      projects = await Project.find().sort({ created_at: -1 }).lean();
    } else {
      // For admins and follow-up users, find their assigned projects
      const assignments = await ProjectAssignment.find({ 
        user_id: new mongoose.Types.ObjectId(userId) 
      });

      const projectIds = assignments.map(assignment => assignment.project_id);

      // Return only projects the user is assigned to
      projects = await Project.find({ 
        _id: { $in: projectIds } 
      }).sort({ created_at: -1 }).lean();
    }

    // Calculate real-time statistics for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const stats = await this.calculateProjectTotals(project._id.toString());
        
        return {
          ...project,
          total_promised_amount: stats.total_promised_amount,
          total_collected_amount: stats.total_collected_amount,
          collection_percentage: stats.collection_percentage
        };
      })
    );

    return projectsWithStats;
  }

  /**
   * Get a single project by ID
   * 
   * Requirements: 1.5
   */
  async getProjectById(projectId: string): Promise<IProject | null> {
    return await Project.findById(projectId);
  }

  /**
   * Update project details
   * 
   * Requirements: 1.5
   */
  async updateProject(projectId: string, data: UpdateProjectData): Promise<IProject | null> {
    return await Project.findByIdAndUpdate(
      projectId,
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  /**
   * Update project status
   * 
   * Requirements: 1.6, 9.1, 9.2, 9.3
   */
  async updateProjectStatus(
    projectId: string, 
    status: 'active' | 'inactive' | 'closed'
  ): Promise<IProject | null> {
    return await Project.findByIdAndUpdate(
      projectId,
      { $set: { status } },
      { new: true, runValidators: true }
    );
  }

  /**
   * Calculate and return project financial totals
   * Sums pledge amounts and collected amounts for a specific project
   * Uses amount_paid field which is already calculated per pledge
   * 
   * Requirements: 1.8, 1.9
   */
  async calculateProjectTotals(projectId: string): Promise<{
    total_promised_amount: number;
    total_collected_amount: number;
    collection_percentage: number;
  }> {
    const projectObjectId = new mongoose.Types.ObjectId(projectId);

    // Aggregate totals directly from pledges
    const result = await Pledge.aggregate([
      {
        $match: { project_id: projectObjectId }
      },
      {
        $group: {
          _id: null,
          total_promised: { $sum: '$promised_amount' },
          total_collected: { $sum: '$amount_paid' }
        }
      }
    ]);

    const total_promised_amount = result.length > 0 ? result[0].total_promised : 0;
    const total_collected_amount = result.length > 0 ? result[0].total_collected : 0;
    
    // Calculate collection percentage
    const collection_percentage = total_promised_amount > 0 
      ? Math.round((total_collected_amount / total_promised_amount) * 100) 
      : 0;

    return {
      total_promised_amount,
      total_collected_amount,
      collection_percentage
    };
  }

  /**
   * Update project totals when pledges change
   * Recalculates and updates the project's financial totals
   * 
   * Requirements: 1.8, 1.9
   */
  async updateProjectTotals(projectId: string): Promise<IProject | null> {
    const totals = await this.calculateProjectTotals(projectId);

    return await Project.findByIdAndUpdate(
      projectId,
      { 
        $set: { 
          total_promised_amount: totals.total_promised_amount,
          total_collected_amount: totals.total_collected_amount
        } 
      },
      { new: true, runValidators: true }
    );
  }
}

export const projectService = new ProjectService();
