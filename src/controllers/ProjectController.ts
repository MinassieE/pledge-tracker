import { Request, Response } from 'express';
import { projectService } from '../services/ProjectService';
import mongoose from 'mongoose';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Create a new project (Super Admin only)
 * POST /api/projects
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export async function createProject(req: Request, res: Response) {
  try {
    const { name, description, start_date } = req.body;

    // Validate required fields
    if (!name || !start_date) {
      return res.status(400).json({
        success: false,
        message: 'Name and start_date are required.'
      });
    }

    // Validate start_date format
    const startDate = new Date(start_date);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start_date format.'
      });
    }

    // Check for duplicate project name
    const { Project } = await import('../modules/Project');
    const existingProject = await Project.findOne({ name });
    if (existingProject) {
      return res.status(409).json({
        success: false,
        message: 'Project with this name already exists.'
      });
    }

    const project = await projectService.createProject({
      name,
      description,
      start_date: startDate
    });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      data: project
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create project.',
      error: getErrorMessage(error)
    });
  }
}

/**
 * Get all projects with role-based filtering
 * GET /api/projects
 * 
 * Requirements: 1.7, 2.1, 2.2, 2.3, 2.4
 */
export async function getProjects(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const projects = await projectService.getProjects(
      req.user.id,
      req.user.role
    );

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve projects.',
      error: getErrorMessage(error)
    });
  }
}

/**
 * Get a single project by ID
 * GET /api/projects/:id
 * 
 * Requirements: 1.5
 */
export async function getProjectById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.'
      });
    }

    const project = await projectService.getProjectById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve project.',
      error: getErrorMessage(error)
    });
  }
}

/**
 * Update project details (Super Admin only)
 * PUT /api/projects/:id
 * 
 * Requirements: 1.5
 */
export async function updateProject(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.'
      });
    }

    // Validate status if provided
    if (status && !['active', 'inactive', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active', 'inactive', or 'closed'."
      });
    }

    // Check if project exists
    const existingProject = await projectService.getProjectById(id);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    // Check for duplicate name if name is being updated
    if (name && name !== existingProject.name) {
      const { Project } = await import('../modules/Project');
      const duplicateProject = await Project.findOne({ name });
      if (duplicateProject) {
        return res.status(409).json({
          success: false,
          message: 'Project with this name already exists.'
        });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const updatedProject = await projectService.updateProject(id, updateData);

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      data: updatedProject
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update project.',
      error: getErrorMessage(error)
    });
  }
}

/**
 * Update project status (Super Admin only)
 * PUT /api/projects/:id/status
 * 
 * Requirements: 1.6, 9.1, 9.2, 9.3
 */
export async function updateProjectStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.'
      });
    }

    // Validate status
    if (!status || !['active', 'inactive', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active', 'inactive', or 'closed'."
      });
    }

    // Check if project exists
    const existingProject = await projectService.getProjectById(id);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    const updatedProject = await projectService.updateProjectStatus(id, status);

    return res.status(200).json({
      success: true,
      message: `Project status updated to '${status}'.`,
      data: updatedProject
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update project status.',
      error: getErrorMessage(error)
    });
  }
}
