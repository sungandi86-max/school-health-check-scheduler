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
      setNotice('Supabase 환경변수가 없어 원격 저장 모드를 선택할 수 없습니다. 현재 브라우저 저장 모드로 계속 사용할 수 있습니다.');
      return;
    }
    setStorageMode(nextMode);
    setMode(nextMode);
    setNotice(
      nextMode === 'supabase'
        ? 'Supabase 모드가 선택되었습니다. 연결 실패 시 앱은 자동으로 localStorage fallback을 사용합니다.'
        : 'localStorage 모드로 설정했습니다. 이 브라우저에 데이터가 저장됩니다.',
    );
  };

  return (
    <section className="storage-settings-panel">
      <div className="storage-settings-header">
        <div>
          <p className="eyebrow">저장소 설정</p>
          <h3>현재 저장 방식: {effectiveMode}</h3>
          <p>선택된 저장 모드: {mode === 'supabase' ? 'Supabase' : 'localStorage'}</p>
        </div>
        <SupabaseStatusBadge />
      </div>

      <div className="storage-option-grid">
        <label className={`storage-option-card ${mode === 'local' ? 'selected' : ''}`}>
          <input type="radio" name="storage-mode" checked={mode === 'local'} onChange={() => changeMode('local')} />
          <span>
            <strong>localStorage 사용</strong>
            <small>현재 브라우저에 데이터를 저장합니다. Supabase 설정이 없어도 사용할 수 있는 기본 방식입니다.</small>
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
            <strong>Supabase 사용</strong>
            <small>
              {supabaseConfigured
                ? '여러 기기에서 세션, 명렬표, 운영상태, 운영 로그를 공유하는 원격 저장 모드입니다.'
                : '환경변수 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY 설정이 필요합니다.'}
            </small>
          </span>
        </label>
      </div>

      <div className="storage-warning">
        <p>Supabase 연결이 실패해도 앱은 종료되지 않고 브라우저 저장 데이터로 계속 동작합니다.</p>
        <p>학생 이름 등 명렬표 정보는 내부 운영용으로만 사용하고 외부 공유 화면에는 전체 목록을 노출하지 않습니다.</p>
      </div>
      {notice && <p className="storage-mode-notice">{notice}</p>}
    </section>
  );
}
