import { useState } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { getStorageMode, isRemoteStorageAvailable, setStorageMode } from '../../lib/storage/storageProvider';
import type { StorageMode } from '../../lib/storage/storageAdapter';
import { SupabaseStatusBadge } from './SupabaseStatusBadge';

export function StorageSettingsPanel() {
  const [mode, setMode] = useState<StorageMode>(() => getStorageMode());
  const [notice, setNotice] = useState('');
  const supabaseConfigured = isSupabaseConfigured();
  const remoteAvailable = isRemoteStorageAvailable();
  const effectiveMode = mode === 'supabase' && remoteAvailable ? 'Supabase' : 'localStorage';

  const changeMode = (nextMode: StorageMode) => {
    if (nextMode === 'supabase' && !remoteAvailable) {
      setNotice('학교 서버 저장을 사용하려면 Supabase 환경 설정이 필요합니다. 현재는 기본 저장으로 계속 사용할 수 있습니다.');
      return;
    }
    setStorageMode(nextMode);
    setMode(nextMode);
    setNotice(
      nextMode === 'supabase'
        ? '학교 서버 저장을 사용합니다. 여러 기기에서 같은 데이터를 사용할 수 있습니다.'
        : '기본 저장으로 설정했습니다. 현재 브라우저에 데이터를 저장합니다.',
    );
  };

  return (
    <section className="storage-settings-panel">
      <div className="storage-settings-header">
        <div>
          <p className="eyebrow">저장소 설정</p>
          <h3>현재 저장 방식: {effectiveMode === 'Supabase' ? '학교 서버 저장' : '기본 저장'}</h3>
          <p>선택된 저장 방식: {mode === 'supabase' ? '학교 서버 저장' : '기본 저장(권장)'}</p>
        </div>
        <SupabaseStatusBadge />
      </div>

      <div className="storage-option-grid">
        <label className={`storage-option-card ${mode === 'local' ? 'selected' : ''}`}>
          <input type="radio" name="storage-mode" checked={mode === 'local'} onChange={() => changeMode('local')} />
          <span>
            <strong>기본 저장(권장)</strong>
            <small>현재 브라우저에 데이터를 저장합니다. Supabase 설정이 없어도 사용할 수 있습니다.</small>
          </span>
        </label>
        <label className={`storage-option-card ${mode === 'supabase' ? 'selected' : ''} ${!remoteAvailable ? 'disabled' : ''}`}>
          <input
            type="radio"
            name="storage-mode"
            checked={mode === 'supabase'}
            disabled={!remoteAvailable}
            onChange={() => changeMode('supabase')}
          />
          <span>
            <strong>학교 서버 저장</strong>
            <small>
              {supabaseConfigured
                ? '여러 기기에서 같은 데이터를 사용할 수 있습니다.'
                : '여러 기기에서 같은 데이터를 사용하려면 학교 서버 저장을 사용할 수 있습니다. Supabase 환경 설정이 필요합니다.'}
            </small>
          </span>
        </label>
      </div>

      <div className="storage-warning">
        <p>여러 기기에서 같은 데이터를 사용하려면 학교 서버 저장을 사용할 수 있습니다. Supabase 환경 설정이 필요합니다.</p>
        <p>학교 서버 연결이 실패해도 앱은 종료되지 않고 브라우저 저장 데이터로 계속 동작합니다.</p>
        <p>학생 이름 등 명렬표 정보는 내부 운영용으로만 사용하고 외부 공유 화면에는 전체 목록을 노출하지 않습니다.</p>
      </div>
      {notice && <p className="storage-mode-notice">{notice}</p>}
    </section>
  );
}
