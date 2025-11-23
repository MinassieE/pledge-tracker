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
