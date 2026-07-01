import { useState } from 'react';
import { HEALTH_CHECK_TYPES } from '../../lib/healthCheck';
import type { HealthCheckSession, HealthCheckSessionStatus, HealthCheckType } from '../../types/healthCheck';
import { HEALTH_CHECK_SESSION_STATUS_LABELS } from './HealthCheckSessionBadge';

export function HealthCheckSessionForm({
  defaultCheckType,
  defaultDate,
  defaultGrades,
  defaultLocation,
  onSubmit,
}: {
  defaultCheckType: HealthCheckType;
  defaultDate: string;
  defaultGrades: string[];
  defaultLocation: string;
  onSubmit: (input: {
    title: string;
    checkType: HealthCheckType;
    date: string;
    targetGrades: string[];
    location: string;
    status: HealthCheckSessionStatus;
  }) => HealthCheckSession | void | Promise<HealthCheckSession | void | undefined>;
}) {
  const [title, setTitle] = useState('');
  const [checkType, setCheckType] = useState<HealthCheckType>(defaultCheckType);
  const [date, setDate] = useState(defaultDate);
  const [targetGrades, setTargetGrades] = useState(defaultGrades.join(', '));
  const [location, setLocation] = useState(defaultLocation);
  const [status, setStatus] = useState<HealthCheckSessionStatus>('draft');

  const submit = () => {
    if (!date) {
      alert('검진 날짜를 입력해 주세요.');
      return;
    }
    onSubmit({
      title,
      checkType,
      date,
      targetGrades: targetGrades.split(/,|·|\s/).map((grade) => grade.trim()).filter(Boolean),
      location,
      status,
    });
    setTitle('');
  };

  return (
    <div className="session-form">
      <label className="field">
        <span>검진 제목</span>
        <input value={title} placeholder="예: 2·3학년 결핵검진" onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="field">
        <span>검사 종류</span>
        <select value={checkType} onChange={(event) => setCheckType(event.target.value as HealthCheckType)}>
          {HEALTH_CHECK_TYPES.filter((item) => item.isEnabled).map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>검진 날짜</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <label className="field">
        <span>대상 학년</span>
        <input value={targetGrades} placeholder="예: 2, 3" onChange={(event) => setTargetGrades(event.target.value)} />
      </label>
      <label className="field">
        <span>검진 장소</span>
        <input value={location} placeholder="예: 중앙현관 앞 검진버스" onChange={(event) => setLocation(event.target.value)} />
      </label>
      <label className="field">
        <span>상태</span>
        <select value={status} onChange={(event) => setStatus(event.target.value as HealthCheckSessionStatus)}>
          {Object.entries(HEALTH_CHECK_SESSION_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <button type="button" className="primary session-create-button" onClick={submit}>새 검진 시작</button>
    </div>
  );
}
