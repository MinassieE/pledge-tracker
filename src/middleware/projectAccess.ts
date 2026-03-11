import { Request, Response, NextFunction } from "express";
import { ProjectAssignment } from "../modules/ProjectAssignment";
import mongoose from "mongoose";

/**
 * Project Access Control Middleware
 * 
 * This module provides middleware and helper functions for enforcing project-level
 * access control in the pledge tracker system.
 * 
 * @module projectAccess
 * 
 * @example
 * // Using requireProjectAccess middleware on a route
 * import { requireProjectAccess } from '../middleware/projectAccess';
 * 
 * // Protect dashboard route - projectId from params
 * router.get('/dashboard/:projectId', 
 *   validateToken, 
 *   requireProjectAccess, 
 *   getDashboard
 * );
 * 
 * // Protect pledge creation - project_id from body
 * router.post('/pledges', 
 *   validateToken, 
 *   requireProjectAccess, 
 *   createPledge
 * );
 * 
 * @example
 * // Using getAccessibleProjects helper in a controller
 * import { getAccessibleProjects } from '../middleware/projectAccess';
 * 
 * async function getPledges(req: Request, res: Response) {
 *   const projectIds = await getAccessibleProjects(req.user.id, req.userRole);
 *   
 *   // If projectIds is null, user is super admin - no filtering needed
 *   const query = projectIds ? { project_id: { $in: projectIds } } : {};
 *   
 *   const pledges = await Pledge.find(query);
 *   res.json({ success: true, data: pledges });
 * }
 */

/**
 * Middleware to verify user has access to a specific project
 * Checks req.params.projectId or req.body.project_id
 * Super admins bypass all checks
 * Other users must have a ProjectAssignment record
 */
export function requireProjectAccess(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract project ID from params or body
  const projectId = req.params.projectId || req.body.project_id;

  // Validate project ID is provided
  if (!projectId) {
    res.status(400).json({
      success: false,
      error: "Project ID is required"
    });
    return;
  }

  // Validate project ID format
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    res.status(400).json({
      success: false,
      error: "Invalid project ID format"
    });
    return;
  }

  // Super admins bypass all project access checks
  if (req.userRole === "superAdmin") {
    next();
    return;
  }

  // Ensure user is authenticated
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: "Authentication required"
    });
    return;
  }

  // Check if user has project assignment
  ProjectAssignment.findOne({
    user_id: new mongoose.Types.ObjectId(req.user.id),
    project_id: new mongoose.Types.ObjectId(projectId)
  })
    .then((assignment) => {
      if (assignment) {
        next(); // User has access
      } else {
        res.status(403).json({
          success: false,
          error: "You do not have access to this project"
        });
      }
    })
    .catch((error) => {
      console.error("Error checking project access:", error);
      res.status(500).json({
        success: false,
        error: "Error verifying project access"
      });
    });
}

/**
 * Helper function to get list of project IDs a user can access
 * Super admins can access all projects (returns null to indicate no filtering needed)
 * Other users get their assigned project IDs
 * 
 * @param userId - The user's ID
 * @param role - The user's role
 * @returns Promise<string[] | null> - Array of project IDs or null for super admins
 */
export async function getAccessibleProjects(
  userId: string,
  role: string
): Promise<string[] | null> {
  // Super admins can access all projects
  if (role === "superAdmin") {
    return null; // null indicates no filtering needed
  }

  // Validate user ID format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID format");
  }

  try {
    // Find all project assignments for this user
    const assignments = await ProjectAssignment.find({
      user_id: new mongoose.Types.ObjectId(userId)
    }).select("project_id");

    // Extract and return project IDs as strings
    return assignments.map((assignment) => assignment.project_id.toString());
  } catch (error) {
    console.error("Error fetching accessible projects:", error);
    throw new Error("Error fetching accessible projects");
  }
}
