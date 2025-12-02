import { Request, Response, NextFunction } from "express";

// Authorization Middleware
export function authorize(rolesRequired: string[] | string) {
  return function (req: Request, res: Response, next: NextFunction) {
    // Ensure rolesRequired is an array for consistent checks
    const roles = Array.isArray(rolesRequired) ? rolesRequired : [rolesRequired];

    // Check if the user's role from the request object matches any of the required roles
    if (req.userRole && roles.includes(req.userRole)) {
      next(); // User is authorized, proceed
    } else {
      res.status(401).json({ success: false, error: "Unauthorized" });
    }
  };
}
