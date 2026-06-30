import { useState } from 'react';
import { getStorageMode, isRemoteStorageAvailable, setStorageMode } from '../../lib/storage/storageProvider';
import type { StorageMode } from '../../lib/storage/storageAdapter';

export function StorageSettingsPanel() {
  const [mode, setMode] = useState<StorageMode>(() => getStorageMode());
  const [notice, setNotice] = useState('');
  const remoteAvailable = isRemoteStorageAvailable();
  const effectiveMode = mode === 'supabase' && remoteAvailable ? '학교 서버 저장' : '기본 저장';

  const changeMode = (nextMode: StorageMode) => {
    if (nextMode === 'supabase' && !remoteAvailable) {
      setNotice('학교 서버 저장을 사용하려면 학교 서버 연결이 필요합니다. 현재는 기본 저장으로 계속 사용할 수 있습니다.');
      return;
    }
    setStorageMode(nextMode);
    setMode(nextMode);
    setNotice(
      nextMode === 'supabase'
        ? '학교 서버 저장을 사용합니다. 여러 컴퓨터에서 같은 데이터를 사용할 수 있습니다.'
        : '기본 저장으로 설정했습니다. 이 컴퓨터에 데이터를 저장합니다.',
    );
  };

  return (
    <section className="storage-settings-panel">
      <div className="storage-settings-header">
        <div>
          <p className="eyebrow">저장 방식</p>
          <h3>현재 저장 방식: {effectiveMode}</h3>
          <p>선택된 저장 방식: {mode === 'supabase' ? '학교 서버 저장' : '기본 저장(권장)'}</p>
        </div>
      </div>

      <div className="storage-option-grid">
        <label className={`storage-option-card ${mode === 'local' ? 'selected' : ''}`}>
          <input type="radio" name="storage-mode" checked={mode === 'local'} onChange={() => changeMode('local')} />
          <span>
            <strong>기본 저장(권장)</strong>
            <small>이 컴퓨터에 데이터를 저장합니다. 인터넷이 없어도 사용할 수 있습니다.</small>
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
            <small>여러 컴퓨터에서 같은 데이터를 사용할 수 있습니다. 학교 서버 연결이 필요합니다.</small>
          </span>
        </label>
      </div>
      {notice && <p className="storage-mode-notice">{notice}</p>}
    </section>
  );
}
