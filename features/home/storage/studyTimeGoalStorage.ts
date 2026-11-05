import AsyncStorage from "@react-native-async-storage/async-storage";

export interface StudyTimeGoal {
  enabled: boolean;
  targetMinutes: number;
}

export const DEFAULT_STUDY_TIME_GOAL: StudyTimeGoal = {
  enabled: true,
  targetMinutes: 30,
};

const STORAGE_KEY = "settings:study-time-goal:v1";
const MIN_TARGET_MINUTES = 5;
const MAX_TARGET_MINUTES = 180;

function normalizeGoal(value: unknown): StudyTimeGoal {
  if (!value || typeof value !== "object") return DEFAULT_STUDY_TIME_GOAL;
  const candidate = value as Partial<StudyTimeGoal>;
  const target = Number(candidate.targetMinutes);
  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : true,
    targetMinutes: Number.isFinite(target)
      ? Math.min(MAX_TARGET_MINUTES, Math.max(MIN_TARGET_MINUTES, Math.round(target / 5) * 5))
      : DEFAULT_STUDY_TIME_GOAL.targetMinutes,
  };
}

export async function loadStudyTimeGoal(): Promise<StudyTimeGoal> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  if (!value) return DEFAULT_STUDY_TIME_GOAL;
  try {
    return normalizeGoal(JSON.parse(value));
  } catch {
    return DEFAULT_STUDY_TIME_GOAL;
  }
}

export async function saveStudyTimeGoal(goal: StudyTimeGoal): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeGoal(goal)));
}
