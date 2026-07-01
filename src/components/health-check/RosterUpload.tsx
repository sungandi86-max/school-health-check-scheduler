import { FileInput } from 'lucide-react';
import { useRef, useState } from 'react';
import { getClassesFromStudents, parseRosterFile } from '../../lib/roster';
import type { HealthCheckStudent, HealthCheckType } from '../../types/healthCheck';

export function RosterUpload({
  checkType,
  sessionId,
  sessionTitle,
  students,
  onUpload,
}: {
  checkType: HealthCheckType;
  sessionId: string;
  sessionTitle?: string;
  students: HealthCheckStudent[];
  onUpload: (students: HealthCheckStudent[]) => void | Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');

  const handleFile = async (file?: File) => {
    if (!file) return;
    const parsed = await parseRosterFile(file, checkType, sessionId);
    if (!parsed.length) {
      alert('명렬표에서 학생 정보를 찾지 못했습니다. 학년, 반, 번호, 이름 열이 있는지 확인해 주세요.');
      return;
    }
    setFileName(file.name);
    await onUpload(parsed);
  };

  const classCount = getClassesFromStudents(students).length;

  return (
    <section className="card roster-upload-card">
      <div>
        <p className="eyebrow">명렬표</p>
        <h2>학생 명렬표 업로드</h2>
        <p className="table-description">엑셀 또는 CSV에서 학년, 반, 번호, 이름을 읽어 현재 세션의 학생 목록을 만듭니다.</p>
        <p className="table-description">현재 세션: {sessionTitle || sessionId || '먼저 검진 세션을 선택해 주세요.'}</p>
      </div>
      <div className="roster-upload-actions">
        <button type="button" className="primary" onClick={() => fileRef.current?.click()}>
          <FileInput size={17} />
          명렬표 업로드
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(event) => handleFile(event.target.files?.[0])} />
        {fileName && <span>{fileName}</span>}
      </div>
      <div className="roster-upload-summary">
        <div>
          <strong>{students.length}</strong>
          <span>{students.length ? '등록된 학생' : '업로드 전'}</span>
        </div>
        <div>
          <strong>{classCount}</strong>
          <span>{classCount ? '등록된 학급' : '학급 없음'}</span>
        </div>
      </div>
    </section>
  );
}
