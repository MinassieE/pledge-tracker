import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Admin } from '../../modules/admin';
import { PasswordReset } from '../../modules/PasswordReset';
import { generateOTP, getOTPExpiration } from '../../utils/otpGenerator';
import nodemailer from 'nodemailer';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Send OTP email
 */
async function sendOTPEmail(email: string, otp: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: '"NCIC Pledge Follow-up" <no-reply@NCIC.com>',
    to: email,
    subject: 'Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You have requested to reset your password. Use the following OTP to proceed:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
        </div>
        <p><strong>This OTP will expire in 10 minutes.</strong></p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #777; font-size: 12px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
    text: `Password Reset OTP: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you did not request a password reset, please ignore this email.`,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * POST /auth/forgot-password
 * Request password reset OTP
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
    }

    // Check if user exists
    const user = await Admin.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If the email exists, an OTP has been sent.',
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = getOTPExpiration();

    // Save OTP to database
    await PasswordReset.create({
      email: email.toLowerCase(),
      otp,
      expiresAt,
      used: false,
    });

    // Send OTP email
    await sendOTPEmail(email, otp);

    return res.status(200).json({
      success: true,
      message: 'OTP has been sent to your email.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request.',
      error: getErrorMessage(error),
    });
  }
}

/**
 * POST /auth/verify-otp
 * Verify OTP before allowing password reset
 */
export async function verifyOTP(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required.',
      });
    }

    // Find valid OTP
    const resetRecord = await PasswordReset.findOne({
      email: email.toLowerCase(),
      otp,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP.',
      error: getErrorMessage(error),
    });
  }
}

/**
 * POST /auth/reset-password
 * Reset password using OTP
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Find valid OTP
    const resetRecord = await PasswordReset.findOne({
      email: email.toLowerCase(),
      otp,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP.',
      });
    }

    // Find user
    const user = await Admin.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Mark OTP as used
    resetRecord.used = true;
    await resetRecord.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password.',
      error: getErrorMessage(error),
    });
  }
}

/**
 * POST /auth/change-password
 * Change password for logged-in user
 */
export async function changePassword(req: Request, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    // Find user
    const user = await Admin.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password.',
      error: getErrorMessage(error),
    });
  }
}
