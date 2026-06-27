import { getAccessMode } from '../../lib/access';
import type { UserRole } from '../../types/auth';

export function AccessNotice({ role }: { role: UserRole }) {
  const mode = getAccessMode(role);
  return (
    <section className={`access-notice ${mode.isEditable ? 'editable' : 'readonly'}`}>
      <strong>{mode.isEditable ? '입력/수정 가능' : '보기 전용'}</strong>
      <span>{mode.description}</span>
    </section>
  );
}
