import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Admin } from '../../modules/admin';
import { Pledge } from '../../modules/pledge';
import { Project } from '../../modules/Project';
import { ProjectAssignment } from '../../modules/ProjectAssignment';

import { generatePassword } from '../../utils/passwordGenerator';
import { emailNotificationService } from '../../services/EmailNotificationService';
import mongoose from 'mongoose';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
}

// ------------------------
// Add an Admin User
// ------------------------
export async function addAdmin(req: Request, res: Response) {
    const plainPassword = generatePassword();

    try {
        const { first_name, middle_name, email } = req.body;

        if (!first_name || !middle_name || !email) {
            return res.status(400).json({
                success: false,
                message: 'First name, middle name, and email are required.'
            });
        }

        // ✅ Check if email already exists
        const existingUser = await Admin.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'This email is already registered. Please use another email.'
            });
        }

        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const newAdmin = new Admin({
            first_name,
            middle_name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'admin'
        });

        await newAdmin.save();

        // Send account creation email with password and login link
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/login`;
        await emailNotificationService.sendAccountCreationEmail({
            email: newAdmin.email,
            password: plainPassword,
            firstName: newAdmin.first_name,
            middleName: newAdmin.middle_name,
            role: 'admin',
            loginUrl
        });

        return res.status(201).json({
            success: true,
            message: "Admin account created successfully.",
            data: newAdmin
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Admin creation failed.',
            error: getErrorMessage(error)
        });
    }
}

// ------------------------
// Add a Follow-Up User
// ------------------------
export async function addFollowUp(req: Request, res: Response) {
    const plainPassword = generatePassword();

    try {
        const { first_name, middle_name, email } = req.body;

        if (!first_name || !middle_name || !email) {
            return res.status(400).json({
                success: false,
                message: 'First name, middle name, and email are required.'
            });
        }

        // ✅ Check if email already exists
        const existingUser = await Admin.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'This email is already registered. Please use another email.'
            });
        }

        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const newFollowUp = new Admin({
            first_name,
            middle_name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'followUp'
        });

        await newFollowUp.save();

        // Send account creation email with password and login link
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/login`;
        await emailNotificationService.sendAccountCreationEmail({
            email: newFollowUp.email,
            password: plainPassword,
            firstName: newFollowUp.first_name,
            middleName: newFollowUp.middle_name,
            role: 'followUp',
            loginUrl
        });

        return res.status(201).json({
            success: true,
            message: "Follow-up account created successfully.",
            data: newFollowUp
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Creation failed.',
            error: getErrorMessage(error)
        });
    }
}

// ------------------------
// Get All Follow-Up Users
// Query params:
// - project_id: (optional) Filter by specific project
// - all: (optional) If 'true', returns all follow-ups without project filtering (for management pages)
// ------------------------
export async function getAllFollowUps(req: Request, res: Response) {
    try {
        const projectId = req.query.project_id as string;
        const fetchAll = req.query.all === 'true';
        
        // If 'all' flag is set, return all follow-ups without filtering (for management pages)
        if (fetchAll) {
            const followUps = await Admin.find({ role: 'followUp' }).select('-password');
            return res.status(200).json({ success: true, data: followUps });
        }
        
        // If project_id is provided, filter by project assignment
        if (projectId) {
            // Find all user IDs assigned to this project
            const assignments = await ProjectAssignment.find({
                project_id: new mongoose.Types.ObjectId(projectId)
            });
            
            const assignedUserIds = assignments.map(a => a.user_id);
            
            // Get follow-up users who are assigned to this project
            const followUps = await Admin.find({
                role: 'followUp',
                _id: { $in: assignedUserIds }
            }).select('-password');
            
            return res.status(200).json({ success: true, data: followUps });
        }
        
        // If no project_id and no 'all' flag, return all follow-ups (for super admin)
        const followUps = await Admin.find({ role: 'followUp' }).select('-password');
        return res.status(200).json({ success: true, data: followUps });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve follow-up users.',
            error: getErrorMessage(error)
        });
    }
}

// ------------------------
// Get a single Follow-Up User 
// ------------------------
export async function getFollowUpById(req: Request, res: Response) {
    try {
        const { id } = req.params;

        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid follow-up user ID."
            });
        }

        // Find follow-up by ID
        const followUp = await Admin.findOne({ _id: id, role: 'followUp' }).select('-password');

        if (!followUp) {
            return res.status(404).json({
                success: false,
                message: "Follow-up user not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: followUp
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve follow-up user.",
            error: getErrorMessage(error)
        });
    }
}


// ------------------------
// Update Follow-Up User Status
// ------------------------
export async function updateFollowUpStatus(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be either 'active' or 'inactive'."
            });
        }

        const user = await Admin.findById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: "Follow-up user not found." });
        }

        if (user.role !== "followUp") {
            return res.status(403).json({
                success: false,
                message: "This user is not a follow-up user."
            });
        }

        user.status = status;
        await user.save();

        return res.status(200).json({
            success: true,
            message: `Follow-up user has been ${status === "active" ? "activated" : "deactivated"}.`,
            data: user
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update follow-up status.",
            error: getErrorMessage(error)
        });
    }
}

// ------------------------
// Add a Pledge
// ------------------------
export async function addPledge(req: Request, res: Response) {
  try {
    const {
      full_name,
      phone_number,
      alt_phone_number,
      email,
      promised_amount,
      currency,
      contribution_type,
      material_type,
      material_quantity,
      other_description,
      promised_start_date,
      promised_end_date,
      paper_form_image,
      assigned_followup,
      project_id
    } = req.body;

    // Validate required fields
    if (
      !full_name ||
      promised_amount === undefined ||
      !contribution_type ||
      !project_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "full_name, promised_amount, contribution_type, and project_id are required."
      });
    }

    // Validate project_id format
    if (!mongoose.Types.ObjectId.isValid(project_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID format."
      });
    }

    // Check that the project exists
    const project = await Project.findById(project_id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found."
      });
    }

    // Check that the project status is 'active'
    if (project.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Cannot create pledges for ${project.status} projects.`
      });
    }

    // Verify user has access to this project (unless super admin)
    if (req.userRole !== 'superAdmin') {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Authentication required."
        });
      }

      const assignment = await ProjectAssignment.findOne({
        user_id: new mongoose.Types.ObjectId(req.user.id),
        project_id: new mongoose.Types.ObjectId(project_id)
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this project."
        });
      }
    }

    // Use default dates if not provided
    const startDate = promised_start_date ? new Date(promised_start_date) : new Date();
    const endDate = promised_end_date 
      ? new Date(promised_end_date) 
      : (() => {
          const date = new Date();
          date.setMonth(date.getMonth() + 3);
          return date;
        })();

    /** ---------------------------------------
     * MONTHLY PLEDGE CALCULATIONS
     * --------------------------------------*/

    let monthly_installment_amount: number | undefined = undefined;
    let next_due_date: Date | undefined = undefined;

    if (contribution_type === "monthly") {
      // Calculate the number of months between start and end
      const totalMonths =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth()) +
        1;

      if (totalMonths <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid date range for monthly pledge."
        });
      }

      monthly_installment_amount = promised_amount / totalMonths;

      // First due date = start date
      next_due_date = startDate;
    }

    /** ---------------------------------------
     * CREATE NEW PLEDGE
     * --------------------------------------*/

    const newPledge = new Pledge({
      full_name,
      phone_number: phone_number || '',
      alt_phone_number,
      email,
      promised_amount,
      currency: currency || 'ETB',
      contribution_type,
      material_type,
      material_quantity,
      other_description,
      promised_start_date: startDate,
      promised_end_date: endDate,
      paper_form_image: paper_form_image || 'default_form.png',
      assigned_followup: assigned_followup || undefined,
      project_id: new mongoose.Types.ObjectId(project_id),

      // Payment Stats
      amount_paid: 0,
      remaining_amount: promised_amount,
      percentage_paid: 0,
      status: "notPaid",

      // Monthly Fields
      monthly_installment_amount,
      next_due_date,

      payment_history: [],
      overdue: false
    });

    const savedPledge = await newPledge.save();

    return res.status(201).json({
      success: true,
      message: "Pledge added successfully.",
      pledge: savedPledge
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add pledge.",
      error: getErrorMessage(error)
    });
  }
}

export async function getAllPledges(req: Request, res: Response) {
    try {
        // Merge projectFilter from middleware with query
        const filter = { ...req.projectFilter };
        
        const pledges = await Pledge.find(filter)
            .populate("assigned_followup", "first_name middle_name email role status");

        return res.status(200).json({
            success: true,
            count: pledges.length,
            pledges
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve pledges.",
            error: getErrorMessage(error)
        });
    }
}

// ------------------------
// Bulk Add Pledges (All-or-Nothing)
// ------------------------
export async function bulkAddPledges(req: Request, res: Response) {
  let session: mongoose.ClientSession | null = null;
  
  try {
    const { pledges, project_id } = req.body;

    if (!pledges || !Array.isArray(pledges) || pledges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Pledges array is required and must not be empty."
      });
    }

    // Validate project_id is provided
    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "project_id is required for bulk import."
      });
    }

    // Validate project_id format
    if (!mongoose.Types.ObjectId.isValid(project_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID format."
      });
    }

    // Check that the project exists
    const project = await Project.findById(project_id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found."
      });
    }

    // Check that the project status is 'active'
    if (project.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Cannot create pledges for ${project.status} projects.`
      });
    }

    // Verify user has access to this project (unless super admin)
    if (req.userRole !== 'superAdmin') {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Authentication required."
        });
      }

      const assignment = await ProjectAssignment.findOne({
        user_id: new mongoose.Types.ObjectId(req.user.id),
        project_id: new mongoose.Types.ObjectId(project_id)
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this project."
        });
      }
    }

    // Start session with retry logic
    session = await mongoose.startSession();
    session.startTransaction();

    const createdPledges = [];

    for (let i = 0; i < pledges.length; i++) {
      const pledgeData = pledges[i];
      const {
        full_name,
        phone_number,
        alt_phone_number,
        email,
        promised_amount,
        currency,
        contribution_type,
        material_type,
        material_quantity,
        other_description,
        promised_start_date,
        promised_end_date,
        amount_paid,
        remark,
      } = pledgeData;

      // Validate required fields
      if (
        !full_name ||
        promised_amount === undefined ||
        promised_amount === null ||
        isNaN(Number(promised_amount)) ||
        !contribution_type
      ) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Row ${i + 1}: Invalid data for pledge "${full_name || 'Unknown'}". Missing required fields or invalid promised_amount (got: ${promised_amount}).`
        });
      }

      // Convert promised_amount to number
      const promisedAmountNum = Number(promised_amount);

      // Validate and normalize contribution_type
      const validContributionTypes = ['oneTime', 'monthly', 'material', 'other'];
      if (!validContributionTypes.includes(contribution_type)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Row ${i + 1}: Invalid contribution_type "${contribution_type}" for ${full_name}. Must be oneTime, monthly, material, or other (case-sensitive).`
        });
      }

      // Validate currency if provided
      if (currency && !['ETB', 'USD'].includes(currency)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Row ${i + 1}: Invalid currency "${currency}" for ${full_name}. Must be ETB or USD.`
        });
      }

      // Use default dates if not provided
      const startDate = promised_start_date ? new Date(promised_start_date) : new Date();
      const endDate = promised_end_date 
        ? new Date(promised_end_date) 
        : (() => {
            const date = new Date();
            date.setMonth(date.getMonth() + 3);
            return date;
          })(); // Default: 3 months from now

      // Calculate payment stats
      const paidAmount = amount_paid || 0;
      const remainingAmount = promisedAmountNum - paidAmount;
      const percentagePaid = promisedAmountNum > 0 ? (paidAmount / promisedAmountNum) * 100 : 0;
      
      // Determine status based on payment
      let status: 'paid' | 'notPaid' | 'partial' = 'notPaid';
      if (remainingAmount <= 0) {
        status = 'paid';
      } else if (paidAmount > 0) {
        status = 'partial';
      }

      // Create payment history if amount was paid
      const paymentHistory = paidAmount > 0 ? [{
        amount: paidAmount,
        method: 'bulk_import',
        date: new Date()
      }] : [];

      // Calculate monthly installment if needed
      let monthly_installment_amount: number | undefined = undefined;
      let next_due_date: Date | undefined = undefined;

      if (contribution_type === "monthly") {
        const totalMonths =
          (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth()) +
          1;

        if (totalMonths > 0) {
          monthly_installment_amount = promisedAmountNum / totalMonths;
          next_due_date = startDate;
        }
      }

      // Create remark if provided (system remark without followup_id)
      const remarks = remark && remark.trim() ? [{
        comment: remark.trim(),
        date: new Date()
      }] : [];

      const newPledge = new Pledge({
        full_name,
        phone_number: phone_number || '',
        alt_phone_number,
        email,
        promised_amount: promisedAmountNum,
        currency: currency || 'ETB',
        contribution_type,
        material_type,
        material_quantity,
        other_description,
        promised_start_date: startDate,
        promised_end_date: endDate,
        paper_form_image: 'bulk_import.png',
        amount_paid: paidAmount,
        remaining_amount: remainingAmount,
        percentage_paid: percentagePaid,
        status,
        monthly_installment_amount,
        next_due_date,
        payment_history: paymentHistory,
        remarks: remarks,
        overdue: false,
        project_id: new mongoose.Types.ObjectId(project_id) // Associate with selected project
      });

      const savedPledge = await newPledge.save({ session });
      createdPledges.push(savedPledge);
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${createdPledges.length} pledges.`,
      count: createdPledges.length
    });

  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
      session.endSession();
    }
    
    // Log the detailed error for debugging
    console.error('Bulk import error:', error);
    
    return res.status(500).json({
      success: false,
      message: "Failed to import pledges. Transaction rolled back.",
      error: getErrorMessage(error),
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


export async function getPledgeById(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const pledge = await Pledge.findById(id)
            .populate("assigned_followup", "first_name middle_name email role status");

        if (!pledge) {
            return res.status(404).json({
                success: false,
                message: "Pledge not found."
            });
        }

        return res.status(200).json({
            success: true,
            pledge
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get pledge.",
            error: getErrorMessage(error)
        });
    }
}


export async function updatePledge(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const payment = updateData.payment;   // optional payment object
    const remark = updateData.remark;     // optional remark object

    // 1. Find pledge
    const pledge = await Pledge.findById(id);
    if (!pledge) return res.status(404).json({ success: false, message: "Pledge not found." });

    // 2. Handle direct array updates (for delete operations)
    if (updateData.payment_history !== undefined) {
      pledge.payment_history = updateData.payment_history;
    }

    if (updateData.remarks !== undefined) {
      pledge.remarks = updateData.remarks;
    }

    // 3. Update general fields
    const fieldsToUpdate = [
      "full_name",
      "phone_number",
      "alt_phone_number",
      "email",
      "promised_amount",
      "currency",
      "contribution_type",
      "material_type",
      "material_quantity",
      "other_description",
      "promised_start_date",
      "promised_end_date",
      "paper_form_image",
      "assigned_followup"
    ];

    fieldsToUpdate.forEach(field => {
      if (updateData[field] !== undefined) {
        (pledge as any)[field] = updateData[field];
      }
    });

    // 4. Add new payment if provided
    if (payment && payment.amount && payment.amount > 0) {
      pledge.payment_history.push({
        amount: payment.amount,
        method: payment.method || "unknown",
        date: new Date(),
        added_by: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined
      });
    }

    // 5. Add new remark if provided
    if (remark && remark.comment) {
      pledge.remarks.push({
        followup_id: remark.followup_id || (req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined),
        comment: remark.comment,
        date: new Date()
      });
    }

    // 6. Recalculate totals
    const totalPaid = pledge.payment_history.reduce((sum, p) => sum + p.amount, 0);
    pledge.amount_paid = totalPaid;
    pledge.remaining_amount = pledge.promised_amount - totalPaid;
    pledge.percentage_paid = (totalPaid / pledge.promised_amount) * 100;

    // 7. Update status
    if (pledge.remaining_amount <= 0) {
      pledge.status = "paid";
    } else if (totalPaid === 0) {
      pledge.status = "notPaid";
    } else {
      pledge.status = "partial";
    }

    // 8. Update overdue
    pledge.overdue = pledge.promised_end_date ? (pledge.promised_end_date < new Date() && pledge.remaining_amount > 0) : false;

    // 9. Save and return
    const updatedPledge = await pledge.save();

    return res.status(200).json({
      success: true,
      message: "Pledge updated successfully.",
      pledge: updatedPledge
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update pledge.",
      error: error instanceof Error ? error.message : error
    });
  }
}

export async function getUnassignedPledges(req: Request, res: Response) {
    try {
        // Merge projectFilter from middleware with unassigned filter
        const filter = { 
            ...req.projectFilter,
            assigned_followup: { $exists: false } 
        };
        
        const unassignedPledges = await Pledge.find(filter);

        return res.status(200).json({
            success: true,
            count: unassignedPledges.length,
            pledges: unassignedPledges
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve unassigned pledges.",
            error: getErrorMessage(error)
        });
    }
}

export async function assignPledgeToFollowUp(req: Request, res: Response) {
  try {
    const { followUpId, pledgeId } = req.body;

    if (!followUpId || !pledgeId) {
      return res.status(400).json({ success: false, message: "followUpId and pledgeId are required." });
    }

    // 1. Find follow-up admin
    const followUp = await Admin.findById(followUpId);
    if (!followUp) return res.status(404).json({ success: false, message: "Follow-up admin not found." });

    if (followUp.role !== "followUp") {
      return res.status(400).json({ success: false, message: "User is not a follow-up admin." });
    }

    // 2. Check if pledge exists
    const pledge = await Pledge.findById(pledgeId);
    if (!pledge) return res.status(404).json({ success: false, message: "Pledge not found." });

    // 3. Check if pledge is already assigned to this follow-up
    if (followUp.assigned_pledges.includes(pledge._id)) {
      return res.status(400).json({ success: false, message: "Pledge is already assigned to this follow-up." });
    }

    // 4. Assign pledge to follow-up
    followUp.assigned_pledges.push(pledge._id);

    // 5. Optionally, assign follow-up on pledge as well
    pledge.assigned_followup = followUp._id;

    // 6. Save both
    await followUp.save();
    await pledge.save();

    return res.status(200).json({
      success: true,
      message: "Pledge assigned to follow-up successfully.",
      followUp,
      pledge
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign pledge.",
      error: error instanceof Error ? error.message : error
    });
  }
}

export async function assignMultiplePledgesToFollowUp(req: Request, res: Response) {
  try {
    const { followUpId, pledgeIds } = req.body;

    // Validate input
    if (!followUpId || !Array.isArray(pledgeIds) || pledgeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "followUpId and pledgeIds (array) are required."
      });
    }

    // Find follow-up admin
    const followUp = await Admin.findById(followUpId);
    if (!followUp) return res.status(404).json({ success: false, message: "Follow-up admin not found." });
    if (followUp.role !== "followUp") {
      return res.status(400).json({ success: false, message: "User is not a follow-up admin." });
    }

    const assignedPledges: string[] = [];
    const skippedPledges: string[] = [];

    // Loop through pledges
    for (const pledgeId of pledgeIds) {
      const pledge = await Pledge.findById(pledgeId);

      if (!pledge) {
        skippedPledges.push(pledgeId);
        continue;
      }

      // Skip if already assigned to this follow-up
      if (followUp.assigned_pledges.includes(pledge._id)) {
        skippedPledges.push(pledgeId);
        continue;
      }

      // Optional: skip if already assigned to another follow-up
      if (pledge.assigned_followup && pledge.assigned_followup.toString() !== followUpId) {
        skippedPledges.push(pledgeId);
        continue;
      }

      // Assign pledge
      followUp.assigned_pledges.push(pledge._id);
      pledge.assigned_followup = followUp._id;
      await pledge.save();

      assignedPledges.push(pledgeId);
    }

    // Save follow-up admin
    await followUp.save();

    return res.status(200).json({
      success: true,
      message: "Pledges assignment completed.",
      assignedPledges,
      skippedPledges,
      followUp
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign pledges.",
      error: error instanceof Error ? error.message : error
    });
  }
}


// ------------------------
// Get all pledges assigned to the logged-in follow-up
// ------------------------
export async function getMyPledges(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const myPledges = await Pledge.find({ assigned_followup: req.user.id });
    return res.status(200).json({
      success: true,
      message: "Follow-up pledges retrieved successfully.",
      pledges: myPledges
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve pledges.",
      error: getErrorMessage(error)
    });
  }
}

// ------------------------
// Get a single pledge assigned to the logged-in follow-up
// ------------------------
export async function getMyPledgeById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const pledge = await Pledge.findOne({ _id: id, assigned_followup: req.user.id });

    if (!pledge) {
      return res.status(404).json({ success: false, message: "Pledge not found or not assigned to you." });
    }

    return res.status(200).json({
      success: true,
      message: "Pledge retrieved successfully.",
      pledge
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve pledge.",
      error: getErrorMessage(error)
    });
  }
}

// ------------------------
// Update a pledge assigned to the logged-in follow-up
// (add payment or add remark)
// ------------------------
export async function updateMyPledge(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { payment, remark, ...updateData } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const pledge = await Pledge.findOne({ _id: id, assigned_followup: req.user.id });
    if (!pledge) {
      return res.status(404).json({ success: false, message: "Pledge not found or not assigned to you." });
    }

    // Handle direct array updates (for delete operations)
    if (updateData.payment_history !== undefined) {
      pledge.payment_history = updateData.payment_history;
    }

    if (updateData.remarks !== undefined) {
      pledge.remarks = updateData.remarks;
    }

    // Update general fields (if you want follow-ups to edit certain info)
    const editableFields = ["alt_phone_number", "email", "material_quantity", "other_description"];
    editableFields.forEach(field => {
      if (updateData[field] !== undefined) {
        (pledge as any)[field] = updateData[field];
      }
    });

    // Add new payment if provided
    if (payment && payment.amount && payment.amount > 0) {
      pledge.payment_history.push({
        amount: payment.amount,
        method: payment.method || "unknown",
        date: new Date(),
        added_by: new mongoose.Types.ObjectId(req.user.id)
      });
    }

    // Add new remark if provided
    if (remark && remark.comment) {
      pledge.remarks.push({
        followup_id: new mongoose.Types.ObjectId(req.user.id),
        comment: remark.comment,
        date: new Date()
      });
    }

    // Recalculate totals
    const totalPaid = pledge.payment_history.reduce((sum, p) => sum + p.amount, 0);
    pledge.amount_paid = totalPaid;
    pledge.remaining_amount = pledge.promised_amount - totalPaid;
    pledge.percentage_paid = (totalPaid / pledge.promised_amount) * 100;

    // Update status
    if (pledge.remaining_amount <= 0) {
      pledge.status = "paid";
    } else if (totalPaid === 0) {
      pledge.status = "notPaid";
    } else {
      pledge.status = "partial";
    }

    // Update overdue
    pledge.overdue = pledge.promised_end_date ? (pledge.promised_end_date < new Date() && pledge.remaining_amount > 0) : false;

    const updatedPledge = await pledge.save();

    return res.status(200).json({
      success: true,
      message: "Pledge updated successfully.",
      pledge: updatedPledge
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update pledge.",
      error: getErrorMessage(error)
    });
  }
}


export async function getPledgesByFollowUp(req: Request, res: Response) {
  try {
    const { followUpId } = req.params;

    const followUp = await Admin.findById(followUpId);
    if (!followUp) return res.status(404).json({ success: false, message: "Follow-Up not found." });
    if (followUp.role !== "followUp") return res.status(400).json({ success: false, message: "User is not a follow-up." });

    // Merge projectFilter from middleware with followUp filter
    const filter = { 
      ...req.projectFilter,
      assigned_followup: followUp._id 
    };
    
    const pledges = await Pledge.find(filter);

    return res.status(200).json({
      success: true,
      data: pledges
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get pledges for follow-up.",
      error: getErrorMessage(error)
    });
  }
}



export async function getPledgesByStatus(req: Request, res: Response) {
  try {
    const { status } = req.params; // "paid", "partial", "notPaid"
    const { followUpId, contribution_type } = req.query;

    if (!["paid", "partial", "notPaid"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    // Start with projectFilter from middleware
    const filter: any = { 
      ...req.projectFilter,
      status 
    };

    if (followUpId) filter.assigned_followup = followUpId;
    if (contribution_type) filter.contribution_type = contribution_type;

    const pledges = await Pledge.find(filter).populate("assigned_followup", "first_name middle_name email");

    return res.status(200).json({
      success: true,
      data: pledges
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get pledges by status.",
      error: getErrorMessage(error)
    });
  }
}



export async function getPledgesByContributionType(req: Request, res: Response) {
  try {
    const { type } = req.params; // "oneTime", "monthly", "material", "other"
    if (!["oneTime", "monthly", "material", "other"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid contribution type." });
    }

    // Merge projectFilter from middleware with contribution_type filter
    const filter = { 
      ...req.projectFilter,
      contribution_type: type 
    };
    
    const pledges = await Pledge.find(filter);

    return res.status(200).json({
      success: true,
      data: pledges
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pledges by contribution type.",
      error: getErrorMessage(error)
    });
  }
}


export async function getDueMonthlyPledges(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const today = new Date();
    const userRole = req.userRole;

    // Start with projectFilter from middleware
    const query: any = {
      ...req.projectFilter,
      contribution_type: "monthly",
      next_due_date: { $lte: today },
      remaining_amount: { $gt: 0 }
    };

    // If follow-up user, filter by assigned pledges only
    if (userRole === "followUp") {
      query.assigned_followup = new mongoose.Types.ObjectId(req.user.id);
    }
    // Admin and superAdmin see all due monthly pledges (filtered by project)

    const duePledges = await Pledge.find(query).sort({ next_due_date: 1 });

    return res.status(200).json({
      success: true,
      count: duePledges.length,
      data: duePledges
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch due monthly pledges.",
      error: getErrorMessage(error)
    });
  }
}

export async function getOverduePledges(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const today = new Date();
    const userRole = req.userRole;

    // Start with projectFilter from middleware
    const query: any = {
      ...req.projectFilter,
      promised_end_date: { $lt: today },
      remaining_amount: { $gt: 0 }
    };

    // If follow-up user, filter by assigned pledges only
    if (userRole === "followUp") {
      query.assigned_followup = new mongoose.Types.ObjectId(req.user.id);
    }
    // Admin and superAdmin see all overdue pledges (filtered by project)

    const overduePledges = await Pledge.find(query).sort({ promised_end_date: 1 });

    return res.status(200).json({
      success: true,
      count: overduePledges.length,
      data: overduePledges
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch overdue pledges.",
      error: getErrorMessage(error)
    });
  }
}


/**
 * GET /admin/getAllAdmins
 * Query params:
 * - project_id: (optional) Filter by specific project
 * - all: (optional) If 'true', returns all admins without project filtering (for management pages)
 */
export async function getAllAdmins(req: Request, res: Response) {
  try {
    const projectId = req.query.project_id as string;
    const fetchAll = req.query.all === 'true';
    
    // If 'all' flag is set, return all admins without filtering (for management pages)
    if (fetchAll) {
      const admins = await Admin.find({ role: { $in: ["admin", "superAdmin"] } }).select("-password");
      return res.status(200).json({
        success: true,
        count: admins.length,
        data: admins,
      });
    }
    
    // If project_id is provided, filter by project assignment
    if (projectId) {
      // Find all user IDs assigned to this project
      const assignments = await ProjectAssignment.find({
        project_id: new mongoose.Types.ObjectId(projectId)
      });
      
      const assignedUserIds = assignments.map(a => a.user_id);
      
      // Get admins who are assigned to this project
      const admins = await Admin.find({
        role: { $in: ["admin", "superAdmin"] },
        _id: { $in: assignedUserIds }
      }).select("-password");
      
      return res.status(200).json({
        success: true,
        count: admins.length,
        data: admins,
      });
    }
    
    // If no project_id and no 'all' flag, return all admins (for super admin)
    const admins = await Admin.find({ role: { $in: ["admin", "superAdmin"] } }).select("-password");

    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch admins",
      error: getErrorMessage(error),
    });
  }
}

/**
 * GET /admin/getAdminById/:id
 */
export async function getAdminById(req: Request, res: Response) {
  try {
    const admin = await Admin.findById(req.params.id).select("-password");

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin",
      error: getErrorMessage(error),
    });
  }
}

/**
 * PUT /admin/updateAdmin/:id
 */
export async function updateAdmin(req: Request, res: Response) {
  try {
    const adminId = req.params.id;
    const updateData = req.body;
    
    // Check if trying to deactivate a super admin
    if (updateData.status === 'inactive') {
      const admin = await Admin.findById(adminId);
      
      if (admin && admin.role === 'superAdmin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot deactivate a Super Admin account.'
        });
      }
    }
    
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedAdmin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: updatedAdmin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update admin",
      error: getErrorMessage(error),
    });
  }
}

/**
 * DELETE /admin/deleteAdmin/:id
 */
export async function deleteAdmin(req: Request, res: Response) {
  try {
    const deleted = await Admin.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete admin",
      error: getErrorMessage(error),
    });
  }
}

/**
 * DELETE /admin/deleteFollowUp/:id
 */
export async function deleteFollowUp(req: Request, res: Response) {
  try {
    const followUp = await Admin.findOneAndDelete({
      _id: req.params.id,
      role: "followUp",
    });

    if (!followUp) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }

    res.status(200).json({
      success: true,
      message: "Follow-up deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete follow-up",
      error: getErrorMessage(error),
    });
  }
}

/**
 * DELETE /admin/deletePledge/:id
 */
export async function deletePledge(req: Request, res: Response) {
  try {
    const pledge = await Pledge.findById(req.params.id);

    if (!pledge) {
      return res.status(404).json({ success: false, message: "Pledge not found" });
    }

    // If pledge is assigned to a follow-up, remove it from their assigned_pledges array
    if (pledge.assigned_followup) {
      await Admin.findByIdAndUpdate(
        pledge.assigned_followup,
        { $pull: { assigned_pledges: pledge._id } }
      );
    }

    // Delete the pledge
    await Pledge.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Pledge deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete pledge",
      error: getErrorMessage(error)
    });
  }
}

/**
 * Unassign pledge from follow-up user
 * Allows super admin/admin to remove pledge assignment so it can be reassigned
 */
export async function unassignPledgeFromFollowUp(req: Request, res: Response) {
  try {
    const { pledgeId } = req.body;

    if (!pledgeId) {
      return res.status(400).json({ 
        success: false, 
        message: "pledgeId is required." 
      });
    }

    // Find the pledge
    const pledge = await Pledge.findById(pledgeId);
    if (!pledge) {
      return res.status(404).json({ 
        success: false, 
        message: "Pledge not found." 
      });
    }

    // Check if pledge is assigned to a follow-up
    if (!pledge.assigned_followup) {
      return res.status(400).json({ 
        success: false, 
        message: "Pledge is not assigned to any follow-up." 
      });
    }

    const followUpId = pledge.assigned_followup;

    // Remove pledge from follow-up's assigned_pledges array
    await Admin.findByIdAndUpdate(
      followUpId,
      { $pull: { assigned_pledges: pledge._id } }
    );

    // Remove follow-up assignment from pledge
    pledge.assigned_followup = undefined;
    await pledge.save();

    return res.status(200).json({
      success: true,
      message: "Pledge unassigned from follow-up successfully.",
      pledge
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to unassign pledge.",
      error: error instanceof Error ? error.message : error
    });
  }
}
