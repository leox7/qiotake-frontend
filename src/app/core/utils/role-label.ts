import { Role } from '../models/user.model';

const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'Student',
  LANDLORD: 'Landlord',
  ADMIN: 'Administrator',
};

/** The word to show for a role: 'LANDLORD' -> 'Landlord'. */
export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role];
}
