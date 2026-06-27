export type UserRole = 'healthTeacher' | 'teacher' | 'admin' | 'viewer';

export interface AccessModeInfo {
  role: UserRole;
  label: string;
  description: string;
  isEditable: boolean;
}
