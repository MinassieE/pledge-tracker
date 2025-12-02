import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Admin } from '../../modules/admin';
import { Pledge } from '../../modules/pledge';

import { generatePassword } from '../../utils/passwordGenerator';
import { sendAccountCreationEmail } from '../../utils/emailSender';
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

        // Send plain password to user
        await sendAccountCreationEmail(
            newAdmin.email,
            plainPassword,
            "Greetings, <br> You are invited as an Admin user."
        );

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

        // Send plain password to user
        await sendAccountCreationEmail(
            newFollowUp.email,
            plainPassword,
            "Greetings, <br> You are invited to be a Follow-Up user to follow up promised pledges."
        );

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
// ------------------------
export async function getAllFollowUps(req: Request, res: Response) {
    try {
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
      contribution_type,
      material_type,
      material_quantity,
      other_description,
      promised_start_date,
      promised_end_date,
      paper_form_image,
      assigned_followup
    } = req.body;

    // Validate required fields
    if (
      !full_name ||
      !phone_number ||
      !promised_amount ||
      !contribution_type ||
      !promised_start_date ||
      !promised_end_date ||
      !paper_form_image
    ) {
      return res.status(400).json({
        success: false,
        message:
          "full_name, phone_number, promised_amount, contribution_type, promised_start_date, promised_end_date, and paper_form_image are required."
      });
    }

    /** ---------------------------------------
     * MONTHLY PLEDGE CALCULATIONS
     * --------------------------------------*/

    let monthly_installment_amount: number | undefined = undefined;
    let next_due_date: Date | undefined = undefined;

    if (contribution_type === "monthly") {
      const start = new Date(promised_start_date);
      const end = new Date(promised_end_date);

      // Calculate the number of months between start and end
      const totalMonths =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) +
        1;

      if (totalMonths <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid date range for monthly pledge."
        });
      }

      monthly_installment_amount = promised_amount / totalMonths;

      // First due date = start date
      next_due_date = start;
    }

    /** ---------------------------------------
     * CREATE NEW PLEDGE
     * --------------------------------------*/

    const newPledge = new Pledge({
      full_name,
      phone_number,
      alt_phone_number,
      email,
      promised_amount,
      contribution_type,
      material_type,
      material_quantity,
      other_description,
      promised_start_date,
      promised_end_date,
      paper_form_image,
      assigned_followup: assigned_followup || undefined,

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
        const pledges = await Pledge.find()
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

    // 2. Update general fields
    const fieldsToUpdate = [
      "full_name",
      "phone_number",
      "alt_phone_number",
      "email",
      "promised_amount",
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

    // 3. Add new payment if provided
    if (payment && payment.amount && payment.amount > 0) {
      pledge.payment_history.push({
        amount: payment.amount,
        method: payment.method || "unknown",
        date: new Date()
      });
    }

    // 4. Add new remark if provided
    if (remark && remark.followup_id && remark.comment) {
      pledge.remarks.push({
        followup_id: remark.followup_id,
        comment: remark.comment,
        date: new Date()
      });
    }

    // 5. Recalculate totals
    const totalPaid = pledge.payment_history.reduce((sum, p) => sum + p.amount, 0);
    pledge.amount_paid = totalPaid;
    pledge.remaining_amount = pledge.promised_amount - totalPaid;
    pledge.percentage_paid = (totalPaid / pledge.promised_amount) * 100;

    // 6. Update status
    if (pledge.remaining_amount <= 0) {
      pledge.status = "paid";
    } else if (totalPaid === 0) {
      pledge.status = "notPaid";
    } else {
      pledge.status = "partial";
    }

    // 7. Update overdue
    pledge.overdue = pledge.promised_end_date < new Date() && pledge.remaining_amount > 0;

    // 8. Save and return
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
        const unassignedPledges = await Pledge.find({ assigned_followup: { $exists: false } });

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
        date: new Date()
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
    pledge.overdue = pledge.promised_end_date < new Date() && pledge.remaining_amount > 0;

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

    const pledges = await Pledge.find({ assigned_followup: followUp._id });

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

    const filter: any = { status };

    if (followUpId) filter.assigned_followup = followUpId;
    if (contribution_type) filter.contribution_type = contribution_type;

    const pledges = await Pledge.find(filter);

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

    const pledges = await Pledge.find({ contribution_type: type, archived: false });

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

    const duePledges = await Pledge.find({
      assigned_followup: req.user.id,
      contribution_type: "monthly",
      next_due_date: { $lte: today },
      archived: false
    });

    return res.status(200).json({
      success: true,
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

    const overduePledges = await Pledge.find({
      assigned_followup: req.user.id,
      overdue: true,
      archived: false
    });

    return res.status(200).json({
      success: true,
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
