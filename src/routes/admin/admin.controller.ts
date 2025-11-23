import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Admin } from '../../modules/admin';
import { Pledge } from '../../modules/pledge';

import { generatePassword } from '../../../utils/passwordGenerator';
import { sendAccountCreationEmail } from '../../../utils/emailSender';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
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

        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const newFollowUp = new Admin({
            first_name,
            middle_name,
            email,
            password: hashedPassword,
            role: 'followUp'
        });

        await newFollowUp.save();

        // Send plain password to user
        await sendAccountCreationEmail(
            newFollowUp.email,
            plainPassword,
            "Greetings, <br> You are invited to be a Follow-Up user on the NCIC Website."
        );

        return res.status(201).json(newFollowUp);

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
        if (!full_name || !phone_number || !promised_amount || !contribution_type || !promised_start_date || !promised_end_date || !paper_form_image) {
            return res.status(400).json({
                success: false,
                message: 'full_name, phone_number, promised_amount, contribution_type, promised_start_date, promised_end_date, and paper_form_image are required.'
            });
        }

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
            assigned_followup,
            amount_paid: 0,
            remaining_amount: promised_amount,
            percentage_paid: 0,
            status: 'notPaid',
            payment_history: [],
            overdue: false
        });

        const savedPledge = await newPledge.save();

        return res.status(201).json({
            success: true,
            message: 'Pledge added successfully.',
            pledge: savedPledge
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to add pledge.',
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