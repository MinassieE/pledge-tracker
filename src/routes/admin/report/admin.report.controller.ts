import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Admin } from '../../../modules/admin';
import { Pledge } from '../../../modules/pledge';

import { generatePassword } from '../../../utils/passwordGenerator';
import { sendAccountCreationEmail } from '../../../utils/emailSender';
import mongoose from 'mongoose';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
}

export async function getTotalCollectionStats(req: Request, res: Response) {
  try {
    const pledges = await Pledge.find({ archived: false });

    const totalCollected = pledges.reduce((sum, p) => sum + p.amount_paid, 0);
    const totalRemaining = pledges.reduce((sum, p) => sum + p.remaining_amount, 0);

    return res.status(200).json({
      success: true,
      data: {
        totalCollected,
        totalRemaining
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get collection stats.",
      error: getErrorMessage(error)
    });
  }
}


export async function getMonthlyCollectionReport(req: Request, res: Response) {
  try {
    const { year, month } = req.params;
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const pledges = await Pledge.find({
      "payment_history.date": { $gte: start, $lte: end },
      archived: false
    });

    const totalCollected = pledges.reduce((sum, p) => {
      const monthlyPayments = p.payment_history
        .filter(ph => ph.date >= start && ph.date <= end)
        .reduce((s, ph) => s + ph.amount, 0);
      return sum + monthlyPayments;
    }, 0);

    return res.status(200).json({
      success: true,
      data: { totalCollected, year, month }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get monthly collection report.",
      error: getErrorMessage(error)
    });
  }
}


export async function getFollowUpPerformance(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const pledges = await Pledge.find({ assigned_followup: id, archived: false });

    const totalAssigned = pledges.length;
    const collected = pledges.filter(p => p.status === "paid").length;
    const pending = pledges.filter(p => p.status !== "paid").length;

    return res.status(200).json({
      success: true,
      data: {
        followUpId: id,
        totalAssigned,
        collected,
        pending
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get follow-up performance.",
      error: getErrorMessage(error)
    });
  }
}

