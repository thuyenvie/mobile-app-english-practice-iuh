import { getSessionSnapshot, type SessionSnapshot } from "@/lib/auth/sessionStore";
import type { StudyPlan, StudyReminderInput } from "../../study/api/studyPlanApi";

export interface ReminderDraft { reminderEnabled: boolean; reminderTime: string; quietStart: string; quietEnd: string }
export type DeviceStatus = "unregistered" | "registered" | "permission-denied" | "unsupported" | "error";
export interface ReminderState {
  phase: "idle" | "loading" | "ready" | "missing" | "error";
  plan: StudyPlan | null; draft: ReminderDraft; busy: boolean; error: string; saved: boolean; device: DeviceStatus;
}
interface Dependencies {
  load(): Promise<StudyPlan | null>;
  patch(input: StudyReminderInput): Promise<StudyPlan>;
  register(generation: number): Promise<"registered" | "permission-denied" | "unsupported">;
}
const blank = (): ReminderDraft => ({ reminderEnabled: false, reminderTime: "", quietStart: "", quietEnd: "" });
const hhmm = (value: string | null) => value?.slice(0, 5) ?? "";
const validTime = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const draftFrom = (p: StudyPlan): ReminderDraft => ({ reminderEnabled: p.reminderEnabled,
  reminderTime: hhmm(p.reminderTime), quietStart: hhmm(p.quietStart), quietEnd: hhmm(p.quietEnd) });

/** One controller per owner/generation; old async completions cannot publish or register a new owner. */
export function createReminderController(owner: SessionSnapshot, deps: Dependencies) {
  let state: ReminderState = { phase: "idle", plan: null, draft: blank(), busy: false, error: "", saved: false, device: "unregistered" };
  let disposed = false;
  const listeners = new Set<() => void>();
  const active = () => {
    const now = getSessionSnapshot();
    return !disposed && now.status === "authenticated" && now.subject === owner.subject && now.generation === owner.generation;
  };
  const publish = (next: Partial<ReminderState>) => { if (active()) { state = { ...state, ...next }; listeners.forEach(fn => fn()); } };
  const failure = (error: unknown) => {
    const response = (error as { response?: { status?: number; data?: { code?: number } } })?.response;
    if (response?.status === 409 && response.data?.code === 3208) publish({ phase: "missing", plan: null, saved: false, error: "" });
    else publish({ error: response?.status === 409 ? "Kế hoạch hiện tại không hợp lệ. Vui lòng kiểm tra kế hoạch học." : "Chưa lưu/đồng bộ được. Kiểm tra kết nối và thử lại.", saved: false });
  };
  return {
    getSnapshot: () => state,
    activate() { disposed = false; },
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    dispose() { disposed = true; listeners.clear(); },
    edit(patch: Partial<ReminderDraft>) { if (!state.busy) publish({ draft: { ...state.draft, ...patch }, saved: false, error: "" }); },
    async load() {
      if (!active() || state.busy) return;
      publish({ phase: "loading", busy: true, error: "", saved: false });
      try {
        const plan = await deps.load();
        publish({ phase: plan ? "ready" : "missing", plan, draft: plan ? draftFrom(plan) : blank() });
      } catch (error) { publish({ phase: "error" }); failure(error); }
      finally { publish({ busy: false }); }
    },
    async save() {
      if (!active() || state.busy || state.phase !== "ready" || !state.plan) return;
      const d = state.draft;
      if ((d.reminderEnabled && !validTime(d.reminderTime)) || (d.reminderTime && !validTime(d.reminderTime))
          || (!!d.quietStart !== !!d.quietEnd) || (d.quietStart && (!validTime(d.quietStart) || !validTime(d.quietEnd)))) {
        publish({ error: "Giờ cần đúng HH:mm; giờ yên lặng cần đủ cả hai hoặc để trống cả hai.", saved: false }); return;
      }
      publish({ busy: true, error: "", saved: false });
      try {
        const plan = await deps.patch({ reminderEnabled: d.reminderEnabled, reminderTime: d.reminderTime || null,
          quietStart: d.quietStart || null, quietEnd: d.quietEnd || null });
        publish({ plan, draft: draftFrom(plan), saved: true });
      } catch (error) { failure(error); }
      finally { publish({ busy: false }); }
    },
    async register() {
      if (!active() || state.busy || !state.plan?.reminderEnabled) return;
      publish({ busy: true, error: "" });
      try { publish({ device: await deps.register(owner.generation) }); }
      catch { publish({ device: "error" }); }
      finally { publish({ busy: false }); }
    },
  };
}
