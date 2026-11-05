import { getExamHistory } from "./examResultApi";

export interface StudyTimeDay {
  dateKey: string;
  label: string;
  minutes: number;
  isToday: boolean;
}

interface StudySession {
  submittedAt: number;
  durationMs: number;
}

const DAYS_TO_SHOW = 7;
const HISTORY_PAGE_SIZE = 50;
const MAX_SESSION_MINUTES = 240;

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function weekdayLabel(date: Date): string {
  return ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][date.getDay()];
}

export function emptyRecentStudyTime(now = new Date()): StudyTimeDay[] {
  const today = startOfLocalDay(now);
  return Array.from({ length: DAYS_TO_SHOW }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (DAYS_TO_SHOW - 1 - index));
    const isToday = index === DAYS_TO_SHOW - 1;
    return {
      dateKey: localDateKey(date),
      label: isToday ? `${weekdayLabel(date)}\nHôm nay` : weekdayLabel(date),
      minutes: 0,
      isToday,
    };
  });
}

/** Sums elapsed time for saved exam sessions submitted during the last seven local days. */
export async function getRecentStudyTime(now = new Date()): Promise<StudyTimeDay[]> {
  const days = emptyRecentStudyTime(now);
  const dayByKey = new Map(days.map((day) => [day.dateKey, day]));
  const startTimestamp = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (DAYS_TO_SHOW - 1))).getTime();
  const sessions = new Map<string, StudySession>();

  for (let page = 0; page < 100; page += 1) {
    const history = await getExamHistory(page, HISTORY_PAGE_SIZE);
    if (!history.items.length) break;

    let oldestTimestamp = Number.POSITIVE_INFINITY;
    for (const item of history.items) {
      const submittedAt = Date.parse(item.submittedAt);
      oldestTimestamp = Math.min(oldestTimestamp, submittedAt);
      if (!Number.isFinite(submittedAt) || submittedAt < startTimestamp) continue;

      const startedAt = Date.parse(item.startedAt);
      const elapsed = submittedAt - startedAt;
      if (!Number.isFinite(startedAt) || elapsed < 1_000) continue;

      // A full test can create multiple result rows with the same start time. Count that session once.
      const key = `${item.year}:${item.testNumber}:${item.startedAt}`;
      const previous = sessions.get(key);
      if (!previous || submittedAt > previous.submittedAt) {
        sessions.set(key, {
          submittedAt,
          durationMs: Math.min(elapsed, MAX_SESSION_MINUTES * 60_000),
        });
      }
    }

    if (oldestTimestamp < startTimestamp || page + 1 >= history.totalPages) break;
  }

  for (const session of sessions.values()) {
    const key = localDateKey(new Date(session.submittedAt));
    const day = dayByKey.get(key);
    if (day) day.minutes += Math.max(1, Math.round(session.durationMs / 60_000));
  }

  return days;
}
