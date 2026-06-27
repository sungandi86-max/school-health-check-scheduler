import { getAccessMode } from '../../lib/access';
import type { UserRole } from '../../types/auth';

export function RoleBadge({ role }: { role: UserRole }) {
  const mode = getAccessMode(role);
  return <span className={`role-badge role-${role}`}>{mode.label}</span>;
}
