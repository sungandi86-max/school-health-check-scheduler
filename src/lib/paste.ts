import type { TimetableRow } from '../types';
import { parseSubjectCells } from './subjectParser';

export function parseTimetablePaste(text: string): TimetableRow[] {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => splitPasteLine(line))
    .filter((cells) => cells.some(Boolean))
    .map((cells, index) => {
      const [displayName = `장소${index + 1}`, p1 = '', p2 = '', p3 = '', p4 = '', p5 = '', p6 = '', p7 = '', notes = ''] = cells;
      const parsedPeriods = parseSubjectCells([p1, p2, p3, p4, p5, p6, p7]);
      return {
        locationId: displayName,
        displayName,
        periods: parsedPeriods.periods,
        teachers: parsedPeriods.teachers,
        rawTexts: parsedPeriods.rawTexts,
        notes,
      };
    });
}

function splitPasteLine(line: string) {
  if (line.includes('\t')) return line.split('\t').map((cell) => cell.trim());
  if (line.includes(',')) return line.split(',').map((cell) => cell.trim());
  return line.split(/\s+\/\s+/).map((cell) => cell.trim());
}
