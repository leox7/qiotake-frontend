/** The three roles in QiotaKE. They must match the role names the backend sends. */
export type Role = 'STUDENT' | 'LANDLORD' | 'ADMIN';

/**
 * The basic details of the signed-in user. These are the fields the backend login response
 * (POST /api/auth/verify-otp) sends next to the tokens. Never put a password or ID number here.
 */
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}
