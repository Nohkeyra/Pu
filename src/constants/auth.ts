export const ADMIN_EMAILS = [
  'madnor.noisy@gmail.com',
  'wawasan.orders@gmail.com'
];

export const isUserAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
};
