/**
 * Generates a random 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Gets OTP expiration time (10 minutes from now)
 */
export function getOTPExpiration(): Date {
  const expirationTime = new Date();
  expirationTime.setMinutes(expirationTime.getMinutes() + 10);
  return expirationTime;
}
