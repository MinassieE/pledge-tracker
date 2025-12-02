import * as generator from 'generate-password';

// Utility function to generate a password with predefined options
export function generatePassword(): string {
  return generator.generate({
    length: 8,
    numbers: true,
    symbols: false,
    uppercase: true,
    lowercase: true,
    excludeSimilarCharacters: true,
    strict: true,
  });
}