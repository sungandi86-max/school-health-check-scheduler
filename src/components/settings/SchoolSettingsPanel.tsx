import { useEffect, useMemo, useState } from 'react';
import type { SchoolSettings } from '../../types/settings';
import { StorageSettingsPanel } from './StorageSettingsPanel';

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
  const schoolYear = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const update = <K extends keyof SchoolSettings>(key: K, value: SchoolSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setNotice('');
  };

  const save = () => {
    onSave(draft);
    setNotice('환경설정을 저장했습니다. 새 시간표, 공유 문구, 보고서에 기본값으로 반영됩니다.');
  };

  const reset = () => {
    if (!window.confirm('학교 기본 설정을 기본값으로 되돌리겠습니까?')) return;
    onReset();
    setNotice('환경설정을 기본값으로 되돌렸습니다.');
  };

  return (
    <section className="school-settings-panel stack">
      <div className="section-title settings-page-title">
        <div>
          <p className="eyebrow">환경설정</p>
          <h2>학교별 기본 설정</h2>
          <p className="table-description">학교 정보, 검사 기본값, Display 안내, 저장 상태를 한 곳에서 확인합니다.</p>
        </div>
        <button type="button" className="ghost" onClick={reset}>기본값으로 되돌리기</button>
      </div>

      <div className="settings-category-grid">
        <section className="settings-category-card">
          <div className="settings-category-heading">
            <p className="eyebrow">학교 기본정보</p>
            <h3>보고서와 공유 문구에 표시됩니다</h3>
          </div>
          <div className="settings-field-grid">
            <label className="field">
              <span>학교명</span>
              <input value={draft.schoolName} onChange={(event) => update('schoolName', event.target.value)} placeholder="우리 학교" />
            </label>
            <label className="field">
              <span>학년도</span>
              <input value={`${schoolYear}학년도`} readOnly aria-readonly="true" />
            </label>
            <label className="field wide">
              <span>담당자(선택)</span>
              <input value={draft.defaultHealthTeacherName} onChange={(event) => update('defaultHealthTeacherName', event.target.value)} placeholder="보건교사" />
            </label>
            <label className="field wide">
              <span>문의 연락처</span>
              <input value={draft.contactInfo} onChange={(event) => update('contactInfo', event.target.value)} placeholder="보건실 또는 담당자 연락처" />
            </label>
          </div>
        </section>

        <section className="settings-category-card">
          <div className="settings-category-heading">
            <p className="eyebrow">검사 기본설정</p>
            <h3>새 검진 세션을 만들 때 기본값으로 사용합니다</h3>
          </div>
          <div className="settings-field-grid">
            <label className="field wide">
              <span>기본 검사 장소</span>
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
              <span>기본 이동 시간(분)</span>
              <input type="number" min={0} value={draft.defaultMoveMinutes} onChange={(event) => update('defaultMoveMinutes', Number(event.target.value))} />
            </label>
            <label className="field">
              <span>기본 여유 시간(분)</span>
              <input type="number" min={0} value={draft.defaultBreakMinutes} onChange={(event) => update('defaultBreakMinutes', Number(event.target.value))} />
            </label>
            <label className="field wide">
              <span>기본 안내 문구</span>
              <textarea rows={4} value={draft.defaultNoticeMessage} onChange={(event) => update('defaultNoticeMessage', event.target.value)} />
            </label>
          </div>
        </section>

        <section className="settings-category-card">
          <div className="settings-category-heading">
            <p className="eyebrow">Display 설정</p>
            <h3>보건실과 교무실 화면의 안내 기준입니다</h3>
          </div>
          <div className="settings-display-preview-grid">
            <article>
              <span>보건실 Display 안내 문구</span>
              <p>{draft.defaultNoticeMessage || '운영센터에서 입력한 안내 문구가 표시됩니다.'}</p>
            </article>
            <article>
              <span>교무실 Display 안내 문구</span>
              <p>{draft.defaultNoticeMessage || '운영센터에서 입력한 안내 문구가 표시됩니다.'}</p>
            </article>
          </div>
          <p className="table-description">검진 당일에는 운영센터의 안내 문구가 우선 표시됩니다. 별도 저장 구조는 변경하지 않습니다.</p>
        </section>

        <section className="settings-category-card">
          <div className="settings-category-heading">
            <p className="eyebrow">데이터 설정</p>
            <h3>현재 저장 방식과 연결 상태</h3>
          </div>
          <StorageSettingsPanel />
        </section>
      </div>

      <div className="school-settings-actions">
        <button type="button" className="primary" onClick={save}>환경설정 저장</button>
        {notice && <p className="storage-mode-notice">{notice}</p>}
      </div>
    </section>
  );
}
