import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Admin } from '../../modules/admin';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// SECRET for JWT – ideally store in .env
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = '1d';

export async function adminLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found.' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Optional: update last login
    admin.last_login = new Date();
    await admin.save();

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        id: admin._id,
        first_name: admin.first_name,
        middle_name: admin.middle_name,
        email: admin.email,
        role: admin.role,
        assigned_pledges: admin.assigned_pledges || [],
        token, // send token for frontend authentication
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Login failed.', error: getErrorMessage(error) });
  }
}


export async function changePassword(req: Request, res: Response) {
    try {
        const { id } = req.params; // user ID from route
        const { oldPassword, newPassword } = req.body;

        // Validate input
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Old password and new password are required."
            });
        }

        // Find user
        const user = await Admin.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // Check old password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(403).json({
                success: false,
                message: "Old password is incorrect."
            });
        }

        // Prevent reusing the same password
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: "New password cannot be the same as the old password."
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully."
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to change password.",
            error: getErrorMessage(error)
        });
    }
}