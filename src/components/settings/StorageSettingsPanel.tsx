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
  const effectiveMode = mode === 'supabase' && remoteAvailable ? 'localStorage fallback' : 'localStorage';

  const changeMode = (nextMode: StorageMode) => {
    if (nextMode === 'supabase' && !remoteAvailable) {
      setNotice('Supabase 환경변수가 없어 선택할 수 없습니다.');
      return;
    }
    setStorageMode(nextMode);
    setMode(nextMode);
    setNotice(
      nextMode === 'supabase'
        ? 'Supabase 모드가 선택되었습니다. 단, 실제 원격 저장은 다음 Sprint에서 연결되며 현재는 localStorage fallback을 사용합니다.'
        : 'localStorage 모드로 설정되었습니다. 이 브라우저에 데이터가 저장됩니다.',
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
            <small>현재 브라우저에 저장합니다. 기본 저장 방식입니다.</small>
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
                ? '여러 기기 실시간 공유를 위한 원격 저장 모드입니다. 실제 DB 쓰기는 아직 준비 중입니다.'
                : '환경변수와 DB 설정이 필요합니다.'}
            </small>
          </span>
        </label>
      </div>

      <div className="storage-warning">
        <p>※ Supabase 사용 시 여러 기기에서 실시간 공유가 가능하지만, 환경변수와 DB 설정이 필요합니다.</p>
        <p>※ 이번 버전에서는 Supabase를 선택해도 기존 기능 보호를 위해 localStorage fallback을 유지합니다.</p>
      </div>
      {notice && <p className="storage-mode-notice">{notice}</p>}
    </section>
  );
}
