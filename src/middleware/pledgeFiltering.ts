import { Request, Response, NextFunction } from "express";
import { getAccessibleProjects } from "./projectAccess";
import mongoose from "mongoose";

/**
 * Pledge Filtering Middleware
 * 
 * This module provides middleware for automatically filtering pledge queries
 * based on user's accessible projects. It ensures users only see pledges from
 * projects they're assigned to, while super admins see all pledges.
 * 
 * @module pledgeFiltering
 * 
 * @example
 * // Using pledgeFiltering middleware on pledge routes
 * import { pledgeFiltering } from '../middleware/pledgeFiltering';
 * 
 * // Apply to pledge list endpoint
 * router.get('/pledges', 
 *   validateToken, 
 *   pledgeFiltering, 
 *   getPledges
 * );
 * 
 * // Apply to pledge search endpoint
 * router.get('/pledges/search', 
 *   validateToken, 
 *   pledgeFiltering, 
 *   searchPledges
 * );
 * 
 * @example
 * // Using projectFilter in a controller
 * async function getPledges(req: Request, res: Response) {
 *   // projectFilter is attached by pledgeFiltering middleware
 *   const query = { ...req.projectFilter, ...otherFilters };
 *   
 *   const pledges = await Pledge.find(query);
 *   res.json({ success: true, data: pledges });
 * }
 */

// Extend Express Request interface to include projectFilter
declare global {
  namespace Express {
    interface Request {
      projectFilter?: {
        project_id?: {
          $in: mongoose.Types.ObjectId[];
        };
      };
    }
  }
}

/**
 * Middleware to automatically filter pledge queries by accessible projects
 * 
 * This middleware:
 * - Checks if a specific project_id is provided in query params
 * - Gets the user's accessible projects using getAccessibleProjects helper
 * - For super admins: Sets req.projectFilter based on query param or {} (no filtering)
 * - For other users: Validates project access and sets req.projectFilter
 * - Controllers can then use req.projectFilter in their queries
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7
 */
export async function pledgeFiltering(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id || !req.userRole) {
      res.status(401).json({
        success: false,
        error: "Authentication required"
      });
      return;
    }

    // Check if a specific project_id is requested
    const requestedProjectId = req.query.project_id as string;

    // Get accessible projects for the user
    const projectIds = await getAccessibleProjects(req.user.id, req.userRole);

    // Super admin case
    if (projectIds === null) {
      // If specific project requested, filter by that project
      if (requestedProjectId) {
        req.projectFilter = {
          project_id: new mongoose.Types.ObjectId(requestedProjectId) as any
        };
      } else {
        // No filtering needed
        req.projectFilter = {};
      }
      next();
      return;
    }

    // Non-super-admin case
    if (projectIds.length === 0) {
      // User has no project assignments - return empty filter that matches nothing
      req.projectFilter = {
        project_id: {
          $in: [] as any // Empty array will match no documents
        }
      };
      next();
      return;
    }

    // If specific project requested, verify user has access
    if (requestedProjectId) {
      if (!projectIds.includes(requestedProjectId)) {
        res.status(403).json({
          success: false,
          error: "You do not have access to this project"
        });
        return;
      }
      
      // User has access to requested project
      req.projectFilter = {
        project_id: new mongoose.Types.ObjectId(requestedProjectId) as any
      };
    } else {
      // No specific project requested - filter by all accessible projects
      req.projectFilter = {
        project_id: {
          $in: projectIds.map(id => new mongoose.Types.ObjectId(id))
        }
      };
    }

    next();
  } catch (error) {
    console.error("Error in pledge filtering middleware:", error);
    res.status(500).json({
      success: false,
      error: "Error applying pledge filters"
    });
  }
}
