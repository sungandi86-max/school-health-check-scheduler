import type { TimetableRow } from '../types';

export function parseTimetablePaste(text: string): TimetableRow[] {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(/\t|\/|,/).map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean))
    .map((cells, index) => {
      const [displayName = `장소${index + 1}`, p1 = '', p2 = '', p3 = '', p4 = '', p5 = '', p6 = '', p7 = '', notes = ''] = cells;
      return {
        locationId: displayName,
        displayName,
        periods: [p1, p2, p3, p4, p5, p6, p7],
        notes,
      };
    });
}
