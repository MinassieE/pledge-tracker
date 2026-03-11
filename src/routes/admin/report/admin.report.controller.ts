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
    // Use projectFilter from pledgeFiltering middleware
    const projectFilter = (req as any).projectFilter || {};
    const pledges = await Pledge.find(projectFilter);

    // Separate ETB and USD calculations
    const etbPledges = pledges.filter(p => p.currency === 'ETB' || !p.currency);
    const usdPledges = pledges.filter(p => p.currency === 'USD');

    const totalCollectedETB = etbPledges.reduce((sum, p) => sum + p.amount_paid, 0);
    const totalCollectedUSD = usdPledges.reduce((sum, p) => sum + p.amount_paid, 0);
    
    const totalRemainingETB = etbPledges.reduce((sum, p) => sum + p.remaining_amount, 0);
    const totalRemainingUSD = usdPledges.reduce((sum, p) => sum + p.remaining_amount, 0);
    
    const totalPromisedETB = etbPledges.reduce((sum, p) => sum + p.promised_amount, 0);
    const totalPromisedUSD = usdPledges.reduce((sum, p) => sum + p.promised_amount, 0);

    // Count pledges by status
    const paidCount = pledges.filter(p => p.status === 'paid').length;
    const pendingCount = pledges.filter(p => p.status === 'notPaid').length;
    const partialCount = pledges.filter(p => p.status === 'partial').length;
    const overdueCount = pledges.filter(p => p.overdue).length;

    return res.status(200).json({
      success: true,
      data: {
        totalPledges: pledges.length,
        totalPromisedETB,
        totalPromisedUSD,
        totalCollectedETB,
        totalCollectedUSD,
        remainingBalanceETB: totalRemainingETB,
        remainingBalanceUSD: totalRemainingUSD,
        paidCount,
        pendingCount,
        partialCount,
        overdueCount
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

    // Use projectFilter from pledgeFiltering middleware
    const projectFilter = (req as any).projectFilter || {};
    const pledges = await Pledge.find({
      ...projectFilter,
      "payment_history.date": { $gte: start, $lte: end }
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

    // Use projectFilter from pledgeFiltering middleware
    const projectFilter = (req as any).projectFilter || {};
    const pledges = await Pledge.find({ 
      ...projectFilter,
      assigned_followup: id 
    });

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


export async function getAllFollowUpPerformance(req: Request, res: Response) {
  try {
    // Use projectFilter from pledgeFiltering middleware
    const projectFilter = (req as any).projectFilter || {};
    
    // Build match stage with project filter
    const matchStage: any = { 
      assigned_followup: { $exists: true, $ne: null }
    };
    
    // Add project_id filter if it exists
    if (projectFilter.project_id) {
      matchStage.project_id = projectFilter.project_id;
    }
    
    const performance = await Pledge.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: "$assigned_followup",
          totalPledges: { $sum: 1 },
          completedPledges: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] }
          },
          totalCollectedETB: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ["$currency", "ETB"] }, { $eq: ["$currency", null] }] },
                "$amount_paid",
                0
              ]
            }
          },
          totalCollectedUSD: {
            $sum: {
              $cond: [{ $eq: ["$currency", "USD"] }, "$amount_paid", 0]
            }
          },
          remainingAmountETB: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ["$currency", "ETB"] }, { $eq: ["$currency", null] }] },
                "$remaining_amount",
                0
              ]
            }
          },
          remainingAmountUSD: {
            $sum: {
              $cond: [{ $eq: ["$currency", "USD"] }, "$remaining_amount", 0]
            }
          },
          overdueHandled: {
            $sum: { $cond: ["$overdue", 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: "admins",
          localField: "_id",
          foreignField: "_id",
          as: "followUp"
        }
      },
      { $unwind: "$followUp" },
      {
        $project: {
          followUpId: "$_id",
          name: { $concat: ["$followUp.first_name", " ", "$followUp.middle_name"] },
          first_name: "$followUp.first_name",
          middle_name: "$followUp.middle_name",
          completedPledges: 1,
          totalCollected: { $add: ["$totalCollectedETB", "$totalCollectedUSD"] }, // Combined for sorting
          totalCollectedETB: 1,
          totalCollectedUSD: 1,
          overdueHandled: 1,
          successRate: {
            $cond: [
              { $eq: ["$totalPledges", 0] },
              0,
              { $multiply: [{ $divide: ["$completedPledges", "$totalPledges"] }, 100] }
            ]
          }
        }
      },
      { $sort: { successRate: -1 } }
    ]);

    res.status(200).json({
      success: true,
      count: performance.length,
      data: performance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch follow-up performance",
      error: getErrorMessage(error),
    });
  }
}
