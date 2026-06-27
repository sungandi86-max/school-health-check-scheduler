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

  return (
    <section className="card roster-upload-card">
      <div>
        <p className="eyebrow">명렬표 관리</p>
        <h2>명렬표 업로드</h2>
        <p className="table-description">엑셀 또는 CSV 파일에서 학년, 반, 번호, 이름 열을 읽어 학급별 학생 목록을 만듭니다.</p>
        <p className="table-description">현재 선택된 세션: {sessionTitle || sessionId || '선택된 세션이 없습니다. 먼저 검진 세션을 생성해 주세요.'}</p>
      </div>
      <div className="roster-upload-actions">
        <button type="button" className="primary" onClick={() => fileRef.current?.click()}>
          <FileInput size={17} />
          엑셀 업로드
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(event) => handleFile(event.target.files?.[0])} />
        {fileName && <span>{fileName}</span>}
      </div>
      <div className="roster-upload-summary">
        <div>
          <strong>{students.length}</strong>
          <span>{students.length ? '업로드된 학생 수' : '명렬표가 업로드되지 않았습니다'}</span>
        </div>
        <div>
          <strong>{getClassesFromStudents(students).length}</strong>
          <span>학급 수</span>
        </div>
      </div>
    </section>
  );
}
