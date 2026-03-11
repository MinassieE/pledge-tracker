import express from 'express';
import { authorize } from '../utils/authorize';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  updateProjectStatus
} from '../controllers/ProjectController';
import {
  assignUsersToProject,
  getProjectAssignments,
  removeUserAssignment
} from '../controllers/ProjectAssignmentController';

const projectRouter = express.Router();

/**
 * Project Routes
 * All routes require authentication (validateToken middleware applied at app level)
 */

// Create new project (Super Admin only)
projectRouter.post('/', authorize('superAdmin'), createProject);

// Get all projects (role-based filtering)
projectRouter.get('/', authorize(['superAdmin', 'admin', 'followUp']), getProjects);

// Get single project by ID
projectRouter.get('/:id', authorize(['superAdmin', 'admin', 'followUp']), getProjectById);

// Update project (Super Admin only)
projectRouter.put('/:id', authorize('superAdmin'), updateProject);

// Update project status (Super Admin only)
projectRouter.put('/:id/status', authorize('superAdmin'), updateProjectStatus);

// Project Assignment Routes

// Assign users to project (Super Admin only)
projectRouter.post('/:id/assignments', authorize('superAdmin'), assignUsersToProject);

// Get users assigned to project
projectRouter.get('/:id/assignments', authorize(['superAdmin', 'admin', 'followUp']), getProjectAssignments);

// Remove user assignment from project (Super Admin only)
projectRouter.delete('/:id/assignments/:userId', authorize('superAdmin'), removeUserAssignment);

export default projectRouter;
