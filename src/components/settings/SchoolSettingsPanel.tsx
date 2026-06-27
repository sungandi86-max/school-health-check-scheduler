import { useEffect, useState } from 'react';
import type { SchoolSettings } from '../../types/settings';

export function SchoolSettingsPanel({
  settings,
  onSave,
  onReset,
}: {
  settings: SchoolSettings;
  onSave: (settings: SchoolSettings) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const update = <K extends keyof SchoolSettings>(key: K, value: SchoolSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setNotice('');
  };

  const save = () => {
    onSave(draft);
    setNotice('학교 기본 설정을 저장했습니다. 새 시간표와 공유 문구에 반영됩니다.');
  };

  const reset = () => {
    if (!window.confirm('학교 기본 설정을 기본값으로 되돌리겠습니까?')) return;
    onReset();
    setNotice('학교 기본 설정을 기본값으로 되돌렸습니다.');
  };

  return (
    <section className="school-settings-panel stack">
      <div className="section-title">
        <div>
          <p className="eyebrow">학교 설정</p>
          <h2>학교 기본 설정</h2>
          <p className="table-description">학교별 검진 운영 환경을 저장해 새 시간표, 공유 문구, 보고서에 기본값으로 사용합니다.</p>
        </div>
        <button type="button" className="ghost" onClick={reset}>기본값으로 되돌리기</button>
      </div>

      <div className="school-settings-grid">
        <label className="field">
          <span>학교명</span>
          <input value={draft.schoolName} onChange={(event) => update('schoolName', event.target.value)} placeholder="우리 학교" />
        </label>
        <label className="field">
          <span>보건교사명</span>
          <input value={draft.defaultHealthTeacherName} onChange={(event) => update('defaultHealthTeacherName', event.target.value)} placeholder="보건교사" />
        </label>
        <label className="field wide">
          <span>기본 검진 장소</span>
          <input value={draft.defaultLocation} onChange={(event) => update('defaultLocation', event.target.value)} placeholder="중앙현관 앞 검진버스" />
        </label>
        <label className="field">
          <span>기본 시작 시간</span>
          <input type="time" value={draft.defaultStartTime} onChange={(event) => update('defaultStartTime', event.target.value)} />
        </label>
        <label className="field">
          <span>기본 종료 시간</span>
          <input type="time" value={draft.defaultEndTime} onChange={(event) => update('defaultEndTime', event.target.value)} />
        </label>
        <label className="field">
          <span>기본 이동 소요 시간</span>
          <input type="number" min={0} value={draft.defaultMoveMinutes} onChange={(event) => update('defaultMoveMinutes', Number(event.target.value))} />
        </label>
        <label className="field">
          <span>기본 쉬는 시간/여유 시간</span>
          <input type="number" min={0} value={draft.defaultBreakMinutes} onChange={(event) => update('defaultBreakMinutes', Number(event.target.value))} />
        </label>
        <label className="field wide">
          <span>문의 연락처</span>
          <input value={draft.contactInfo} onChange={(event) => update('contactInfo', event.target.value)} placeholder="보건실 또는 담당자 연락처" />
        </label>
        <label className="field wide">
          <span>기본 안내 문구</span>
          <textarea rows={4} value={draft.defaultNoticeMessage} onChange={(event) => update('defaultNoticeMessage', event.target.value)} />
        </label>
      </div>

      <div className="school-settings-actions">
        <button type="button" className="primary" onClick={save}>학교 설정 저장</button>
        {notice && <p className="storage-mode-notice">{notice}</p>}
      </div>

      <div className="storage-warning">
        <p>현재 학교 설정은 브라우저 localStorage 키 schoolHealthHub.schoolSettings에 저장됩니다.</p>
        <p>Supabase 모드에서도 이번 Sprint에서는 학교 설정만 localStorage를 유지하며, 추후 school_settings 테이블로 이전할 수 있습니다.</p>
      </div>
    </section>
  );
}
