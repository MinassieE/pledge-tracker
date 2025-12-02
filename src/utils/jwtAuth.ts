import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}   

declare global {
  namespace Express {
    interface Request {
      cookies: { [key: string]: string };
      authenticated?: boolean;
      user?: DecodedToken; // Use a specific type for decoded token
      userRole?: string;
    }
  }
}

// Define the structure of the decoded token
interface DecodedToken {
  email: string;
  id: string;
  role: string;
  iat?: number; // Issued at timestamp (optional)
  exp?: number; // Expiration timestamp (optional)
}

// Create JWT tokens
export const createTokens = (user: { email: string; id: string; role: string }) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }

  const accessToken = jwt.sign(
    { email: user.email, id: user.id, role: user.role }, 
    secret,
    { expiresIn: "1h" } // Optional: Set token expiration time
  );

  return accessToken;
};

// Validate JWT tokens
export const validateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, error: "Bearer token is missing" });
  }

  const token = authHeader.split(" ")[1]; // Extract the token
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }

  try {
    const decoded = jwt.verify(token, secret) as DecodedToken;

    // Attach decoded data to req
    req.user = decoded;
    req.authenticated = true;
    req.userRole = decoded.role;
    console.log(decoded.role);
    

    return next();
  } catch (error) {
    console.error("JWT validation error:", getErrorMessage(error)); // Log the error
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
};
