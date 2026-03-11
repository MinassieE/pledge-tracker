import { Request, Response } from 'express';
import { projectAssignmentService } from '../services/ProjectAssignmentService';
import mongoose from 'mongoose';
import { Admin } from '../modules/admin';
import bcrypt from 'bcrypt';
import { generatePassword } from '../utils/passwordGenerator';
import { emailNotificationService } from '../services/EmailNotificationService';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Assign users to a project (Super Admin only)
 * POST /api/projects/:id/assignments
 * 
 * Body can contain:
 * - userIds: string[] - Array of existing user IDs
 * - users: Array<{email, first_name, middle_name, role}> - Array of new user data
 * 
 * Requirements: 3.1, 3.4, 3.5, 3.6, 3.7
 */
export async function assignUsersToProject(req: Request, res: Response) {
  try {
    const { id: projectId } = req.params;
    const { userIds, users } = req.body;

    // Validate project ID format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.'
      });
    }

    // Validate that at least one of userIds or users is provided
    if ((!Array.isArray(userIds) || userIds.length === 0) && (!Array.isArray(users) || users.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one user must be selected.'
      });
    }

    // Verify project exists
    const { Project } = await import('../modules/Project');
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    // Get the super admin making the assignment
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Process existing users (userIds)
    const processedUsers: Array<{
      userId: string;
      email: string;
      firstName: string;
      middleName: string;
      role: 'admin' | 'followUp';
      password?: string;
      isNewUser: boolean;
    }> = [];

    const userIdsToAssign: string[] = [];

    // Handle existing user IDs
    if (Array.isArray(userIds) && userIds.length > 0) {
      for (const userId of userIds) {
        // Validate user ID format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({
            success: false,
            message: `Invalid user ID: ${userId}`
          });
        }

        const user = await Admin.findById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: `User not found: ${userId}`
          });
        }

        userIdsToAssign.push(user._id.toString());
        processedUsers.push({
          userId: user._id.toString(),
          email: user.email,
          firstName: user.first_name,
          middleName: user.middle_name,
          role: user.role === 'admin' ? 'admin' : 'followUp',
          isNewUser: false
        });
      }
    }

    // Handle new users (users array with email, first_name, middle_name, role)
    if (Array.isArray(users) && users.length > 0) {
      for (const userData of users) {
        const { email, first_name, middle_name, role } = userData;

        // Validate required fields
        if (!email || !first_name || !middle_name || !role) {
          return res.status(400).json({
            success: false,
            message: 'Email, first name, middle name, and role are required for new users.'
          });
        }

        // Validate role
        if (role !== 'admin' && role !== 'followUp') {
          return res.status(400).json({
            success: false,
            message: 'Role must be either "admin" or "followUp".'
          });
        }

        // Check if user already exists
        const existingUser = await Admin.findOne({ email: email.toLowerCase() });

        if (existingUser) {
          // User exists - add to assignment list
          userIdsToAssign.push(existingUser._id.toString());
          processedUsers.push({
            userId: existingUser._id.toString(),
            email: existingUser.email,
            firstName: existingUser.first_name,
            middleName: existingUser.middle_name,
            role: existingUser.role === 'admin' ? 'admin' : 'followUp',
            isNewUser: false
          });
        } else {
          // User doesn't exist - create new user
          const plainPassword = generatePassword();
          const hashedPassword = await bcrypt.hash(plainPassword, 10);

          const newUser = new Admin({
            first_name,
            middle_name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role
          });

          await newUser.save();

          userIdsToAssign.push(newUser._id.toString());
          processedUsers.push({
            userId: newUser._id.toString(),
            email: newUser.email,
            firstName: newUser.first_name,
            middleName: newUser.middle_name,
            role: role,
            password: plainPassword,
            isNewUser: true
          });
        }
      }
    }

    // Create project assignments
    const assignments = await projectAssignmentService.assignUsersToProject({
      userIds: userIdsToAssign,
      projectId,
      assignedBy: req.user.id
    });

    // Send email notifications to each user
    const emailResults: Array<{ email: string; success: boolean; error?: string }> = [];
    
    for (const userData of processedUsers) {
      try {
        await emailNotificationService.sendProjectAssignmentEmail(
          userData.email,
          {
            firstName: userData.firstName,
            middleName: userData.middleName
          },
          project.name,
          userData.role,
          userData.password // Will be undefined for existing users
        );
        
        emailResults.push({ email: userData.email, success: true });
      } catch (error) {
        // Log error but don't block the assignment
        console.error(`Failed to send email to ${userData.email}:`, error);
        emailResults.push({
          email: userData.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Check if any emails failed
    const failedEmails = emailResults.filter(r => !r.success);
    const successMessage = failedEmails.length > 0
      ? `Successfully assigned ${assignments.length} user(s) to project. Warning: ${failedEmails.length} email notification(s) failed to send.`
      : `Successfully assigned ${assignments.length} user(s) to project.`;

    return res.status(201).json({
      success: true,
      message: successMessage,
      data: assignments,
      emailResults: failedEmails.length > 0 ? emailResults : undefined
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to assign users to project.',
      error: getErrorMessage(error)
    });
  }
}

/**
 * Get users assigned to a project
 * GET /api/projects/:id/assignments
 * 
 * Requirements: 3.1
 */
export async function getProjectAssignments(req: Request, res: Response) {
  try {
    const { id: projectId } = req.params;

    // Validate project ID format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.'
      });
    }

    // Verify project exists
    const { Project } = await import('../modules/Project');
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    const userIds = await projectAssignmentService.getProjectUsers(projectId);

    // Populate user details
    const users = await Admin.find({
      _id: { $in: userIds }
    }).select('first_name middle_name email role status');

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve project assignments.',
      error: getErrorMessage(error)
    });
  }
}

/**
 * Remove user assignment from a project (Super Admin only)
 * DELETE /api/projects/:id/assignments/:userId
 * 
 * Requirements: 3.9
 */
export async function removeUserAssignment(req: Request, res: Response) {
  try {
    const { id: projectId, userId } = req.params;

    // Validate project ID format
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID.'
      });
    }

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.'
      });
    }

    // Verify project exists
    const { Project } = await import('../modules/Project');
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    // Verify user exists
    const user = await Admin.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const removed = await projectAssignmentService.removeUserAssignment(userId, projectId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'User assignment not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User assignment removed successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to remove user assignment.',
      error: getErrorMessage(error)
    });
  }
}
