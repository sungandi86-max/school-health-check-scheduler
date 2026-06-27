import { ClipboardCopy } from 'lucide-react';
import { useState } from 'react';
import { copyToClipboard } from '../../lib/share';

export function CopyButton({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await copyToClipboard(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button type="button" onClick={copy}>
      <ClipboardCopy size={16} />
      {copied ? '복사되었습니다' : children}
    </button>
  );
}
