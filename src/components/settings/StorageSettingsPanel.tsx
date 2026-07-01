import { useState } from 'react';
import { getStorageMode, isRemoteStorageAvailable, setStorageMode } from '../../lib/storage/storageProvider';
import type { StorageMode } from '../../lib/storage/storageAdapter';

export function StorageSettingsPanel() {
  const [mode, setMode] = useState<StorageMode>(() => getStorageMode());
  const [notice, setNotice] = useState('');
  const remoteAvailable = isRemoteStorageAvailable();
  const effectiveMode = mode === 'supabase' && remoteAvailable ? 'Supabase' : 'localStorage';
  const connectionLabel = remoteAvailable ? '연결 가능' : '미설정';

  const changeMode = (nextMode: StorageMode) => {
    if (nextMode === 'supabase' && !remoteAvailable) {
      setNotice('Supabase 환경변수가 없어 현재는 localStorage로 동작합니다.');
      return;
    }
    setStorageMode(nextMode);
    setMode(nextMode);
    setNotice(nextMode === 'supabase' ? 'Supabase 저장 모드로 설정했습니다.' : 'localStorage 저장 모드로 설정했습니다.');
  };

  return (
    <section className="storage-settings-panel">
      <div className="storage-status-grid" aria-label="현재 데이터 저장 상태">
        <div>
          <span>현재 저장 방식</span>
          <strong>{effectiveMode}</strong>
        </div>
        <div>
          <span>Supabase 연결 상태</span>
          <strong>{connectionLabel}</strong>
        </div>
      </div>

      <div className="storage-option-grid" aria-label="저장 방식 선택">
        <label className={`storage-option-card ${mode === 'local' ? 'selected' : ''}`}>
          <input type="radio" name="storage-mode" checked={mode === 'local'} onChange={() => changeMode('local')} />
          <span>
            <strong>localStorage</strong>
            <small>이 컴퓨터에 저장합니다. 인터넷이 없어도 사용할 수 있습니다.</small>
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
            <strong>Supabase</strong>
            <small>여러 기기에서 같은 데이터를 사용합니다. 연결 상태는 읽기 전용입니다.</small>
          </span>
        </label>
      </div>
      {notice && <p className="storage-mode-notice">{notice}</p>}
    </section>
  );
}
