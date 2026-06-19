export interface ParsedSubjectCell {
  subject: string;
  teacher: string;
  rawText: string;
}

export function parseSubjectCell(value: unknown): ParsedSubjectCell {
  const rawText = String(value ?? '').trim();
  if (!rawText) return { subject: '', teacher: '', rawText: '' };

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    return {
      subject: lines[0],
      teacher: lines[1],
      rawText,
    };
  }

  const slashMatch = rawText.match(/^(.+?)\s*\/\s*(.+)$/);
  if (slashMatch) {
    return {
      subject: slashMatch[1].trim(),
      teacher: slashMatch[2].trim(),
      rawText,
    };
  }

  const parenMatch = rawText.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (parenMatch) {
    return {
      subject: parenMatch[1].trim(),
      teacher: parenMatch[2].trim(),
      rawText,
    };
  }

  return {
    subject: rawText,
    teacher: '',
    rawText,
  };
}

export function parseSubjectCells(values: unknown[], length = 7) {
  const parsed = Array.from({ length }, (_, index) => parseSubjectCell(values[index]));
  return {
    periods: parsed.map((item) => item.subject),
    teachers: parsed.map((item) => item.teacher),
    rawTexts: parsed.map((item) => item.rawText),
  };
}
