export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailValid(email: string): boolean {
  return emailPattern.test(email.trim());
}
