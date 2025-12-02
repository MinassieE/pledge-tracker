import jwt from 'jsonwebtoken';
import { Secret, JwtPayload, SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Generate a JWT Token
export function generateToken(payload: object, expiresIn = '1h'): string {
  const options: SignOptions = { expiresIn: expiresIn as unknown as SignOptions['expiresIn'] };
  return jwt.sign(payload, JWT_SECRET as unknown as Secret, options);
}

// Verify a JWT Token
export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET as unknown as Secret) as any;
}
