const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR; // 1440 min

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
}

/**
 * Décompose une durée totale en minutes en jours, heures et minutes.
 */
export function splitDurationMinutes(totalMinutes: number): DurationParts {
  const safeTotal = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const days = Math.floor(safeTotal / MINUTES_PER_DAY);
  const remainderAfterDays = safeTotal % MINUTES_PER_DAY;
  const hours = Math.floor(remainderAfterDays / MINUTES_PER_HOUR);
  const minutes = remainderAfterDays % MINUTES_PER_HOUR;
  return { days, hours, minutes };
}

/**
 * Recombine jours, heures et minutes en un total entier de minutes.
 */
export function combineDurationToMinutes(
  days: number,
  hours: number,
  minutes: number
): number {
  const safeDays = Math.max(0, Math.floor(Number(days) || 0));
  const safeHours = Math.max(0, Math.floor(Number(hours) || 0));
  const safeMinutes = Math.max(0, Math.floor(Number(minutes) || 0));
  return safeDays * MINUTES_PER_DAY + safeHours * MINUTES_PER_HOUR + safeMinutes;
}

/**
 * Formate une durée stockée en minutes vers un libellé lisible (minutes, heures, jours).
 */
export function formatDuration(
  totalMinutes: number,
  verbose = false
): string {
  const safeTotal = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (safeTotal === 0) {
    return verbose ? '0 minute' : '0 min';
  }

  const { days, hours, minutes } = splitDurationMinutes(safeTotal);
  const parts: string[] = [];

  if (days > 0) {
    parts.push(
      verbose ? `${days} ${days > 1 ? 'jours' : 'jour'}` : `${days} j`
    );
  }
  if (hours > 0) {
    parts.push(
      verbose ? `${hours} ${hours > 1 ? 'heures' : 'heure'}` : `${hours} h`
    );
  }
  if (minutes > 0) {
    parts.push(
      verbose
        ? `${minutes} ${minutes > 1 ? 'minutes' : 'minute'}`
        : `${minutes} min`
    );
  }

  return parts.join(' ');
}
