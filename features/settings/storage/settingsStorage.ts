import { DEFAULT_SETTINGS, type DeviceSettings, type SettingsErrorCode, type SettingsIssue, type SettingsSnapshot, type SettingsUpdate } from "../types";

export const SETTINGS_STORAGE_KEY = "@english-practice/settings:v1";
export interface SettingsStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export class SettingsStorageError extends Error implements SettingsIssue {
  readonly code: SettingsErrorCode;
  constructor(code: SettingsErrorCode, message: string) {
    super(message);
    this.name = "SettingsStorageError";
    this.code = code;
  }
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isTheme = (value: unknown) => value === "system" || value === "light" || value === "dark";

export function parseStoredSettings(raw: string | null): Pick<SettingsSnapshot, "preferences" | "recoveredFields"> {
  if (raw === null) return { preferences: DEFAULT_SETTINGS, recoveredFields: [] };
  let value: unknown;
  try { value = JSON.parse(raw); } catch {
    throw new SettingsStorageError("malformed", "Dữ liệu cài đặt không đọc được. Dữ liệu gốc được giữ nguyên.");
  }
  if (!isRecord(value)) throw new SettingsStorageError("malformed", "Dữ liệu cài đặt không hợp lệ. Dữ liệu gốc được giữ nguyên.");
  // v1 is the first released schema. No historical schema/migration is invented.
  if (value.schemaVersion !== 1) throw new SettingsStorageError("unsupported-version", "Phiên bản cài đặt chưa được hỗ trợ. Dữ liệu gốc được giữ nguyên.");
  const recoveredFields: ("themeMode" | "listeningAutoplay")[] = [];
  if (!isTheme(value.themeMode)) recoveredFields.push("themeMode");
  if (typeof value.listeningAutoplay !== "boolean") recoveredFields.push("listeningAutoplay");
  return {
    preferences: Object.freeze({
      schemaVersion: 1,
      themeMode: isTheme(value.themeMode) ? value.themeMode as DeviceSettings["themeMode"] : DEFAULT_SETTINGS.themeMode,
      listeningAutoplay: typeof value.listeningAutoplay === "boolean" ? value.listeningAutoplay : DEFAULT_SETTINGS.listeningAutoplay,
    }),
    recoveredFields: Object.freeze(recoveredFields),
  };
}
function validateUpdate(patch: unknown): SettingsUpdate {
  if (!isRecord(patch) || Object.keys(patch).some(key => key !== "themeMode" && key !== "listeningAutoplay") ||
      ("themeMode" in patch && !isTheme(patch.themeMode)) ||
      ("listeningAutoplay" in patch && typeof patch.listeningAutoplay !== "boolean")) {
    throw new SettingsStorageError("invalid-update", "Thay đổi cài đặt không hợp lệ.");
  }
  // Copy at call time so a caller cannot mutate a queued patch.
  return { ...patch } as SettingsUpdate;
}
export interface SettingsStore {
  getSnapshot(): SettingsSnapshot;
  subscribe(listener: () => void): () => void;
  hydrate(): Promise<void>;
  updateSettings(patch: SettingsUpdate): Promise<void>;
}
/** One store per device runtime, shared by the provider; all I/O uses one queue. */
export function createSettingsStore(storage: SettingsStorage): SettingsStore {
  let snapshot: SettingsSnapshot = Object.freeze({
    preferences: DEFAULT_SETTINGS, hydration: "pending", persistence: "idle",
    hydrationError: null, persistenceError: null, recoveredFields: Object.freeze([]),
  });
  let queue: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<SettingsSnapshot>) => {
    snapshot = Object.freeze({ ...snapshot, ...patch });
    listeners.forEach(listener => listener());
  };
  const enqueue = (operation: () => Promise<void>) => {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  };
  async function load() {
    if (snapshot.hydration === "ready") return;
    publish({ hydration: "loading", hydrationError: null });
    try {
      const parsed = parseStoredSettings(await storage.getItem(SETTINGS_STORAGE_KEY));
      publish({ ...parsed, hydration: "ready" });
    } catch (cause) {
      const error = cause instanceof SettingsStorageError ? cause :
        new SettingsStorageError("read-failed", "Chưa đọc được cài đặt đã lưu. Vui lòng thử lại.");
      publish({ hydration: "error", hydrationError: error });
      throw error;
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    hydrate: () => enqueue(load),
    updateSettings(patch) {
      let update: SettingsUpdate;
      try { update = validateUpdate(patch); } catch (error) { return Promise.reject(error); }
      return enqueue(async () => {
        // A failed read needs explicit retry; never turn fallback defaults into a write.
        if (snapshot.hydration === "error") throw snapshot.hydrationError;
        await load();
        if (!Object.keys(update).length) return;
        const next: DeviceSettings = Object.freeze({ ...snapshot.preferences, ...update });
        publish({ persistence: "saving", persistenceError: null });
        try {
          await storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          const error = new SettingsStorageError("write-failed", "Chưa lưu được thay đổi. Cài đặt trước đó vẫn được giữ; vui lòng thử lại.");
          publish({ persistence: "error", persistenceError: error });
          throw error;
        }
        // Publish only acknowledged values. A rejected update does not appear saved.
        publish({ preferences: next, persistence: "saved", persistenceError: null, recoveredFields: Object.freeze([]) });
      });
    },
  };
}
