import { Role } from '../models/user.model';

/** The first page each kind of user should see after logging in (or when they open /login while logged in). */
export function getHomeUrl(role: Role): string {
  switch (role) {
    case 'LANDLORD':
      return '/landlord';
    case 'ADMIN':
      return '/admin';
    default:
      return '/listings';
  }
}
