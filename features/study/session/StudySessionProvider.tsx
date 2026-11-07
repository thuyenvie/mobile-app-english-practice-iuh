import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isAxiosError } from "axios";
import { useSession } from "@/lib/auth/useSession";
import { assertSessionGeneration } from "@/lib/auth/sessionStore";
import { getExamErrorMessage } from "../api/examApi";
import { changeStudySession, getActiveStudySession, startStudySession, type StudySession } from "./studySessionApi";

interface SessionContext {
  current: StudySession | null;
  receivedAt: number;
  busy: boolean;
  error: string;
  refresh: () => Promise<void>;
  start: (taskId: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  end: (completeTask: boolean) => Promise<void>;
}
const Context = createContext<SessionContext | null>(null);

export function StudySessionProvider({ children }: PropsWithChildren) {
  const account = useSession();
  const [current, setCurrent] = useState<StudySession | null>(null);
  const [receivedAt, setReceivedAt] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valueRef = useRef<StudySession | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  const mounted = useRef(true);
  const generation = account.generation;
  const pauseKey = `study-session-pause:${encodeURIComponent(account.subject ?? "guest")}`;

  const apply = useCallback((value: StudySession | null) => {
    assertSessionGeneration(generation);
    if (!mounted.current) return;
    valueRef.current = value;
    setCurrent(value);
    setReceivedAt(Date.now());
  }, [generation]);

  const run = useCallback((operation: () => Promise<void>): Promise<void> => {
    pending.current++;
    setBusy(true);
    const result = queue.current.then(async () => {
      assertSessionGeneration(generation);
      if (!mounted.current) return;
      setError("");
      await operation();
    }).catch((cause: unknown) => {
      if (mounted.current) setError(getExamErrorMessage(cause));
      throw cause;
    }).finally(() => {
      pending.current--;
      if (mounted.current) setBusy(pending.current > 0);
    });
    queue.current = result.catch(() => undefined);
    return result;
  }, [generation]);

  const refresh = useCallback(() => run(async () => {
    if (account.status !== "authenticated") return;
    let value = await getActiveStudySession();
    const pendingPause = await AsyncStorage.getItem(pauseKey);
    if (value && (pendingPause === String(value.id) || AppState.currentState === "background") && value.status === "RUNNING") {
      value = await changeStudySession(value.id, "pause");
    }
    await AsyncStorage.removeItem(pauseKey);
    apply(value);
  }), [run, account.status, pauseKey, apply]);

  const start = useCallback((taskId: number) => run(async () => {
    try { apply(await startStudySession(taskId)); }
    catch (cause: unknown) {
      if (isAxiosError(cause) && cause.response?.status === 409) {
        const existing = await getActiveStudySession();
        if (existing) {
          apply(existing);
          // Khong chuyen vao bo tu moi trong khi backend tra ve phien cua task khac.
          throw new Error("Bạn còn một phiên học đang mở. Hãy kết thúc phiên đó trước khi bắt đầu nhiệm vụ khác.");
        }
      }
      throw cause;
    }
  }), [run, apply]);

  const pause = useCallback(() => run(async () => {
    const value = valueRef.current;
    if (!value || value.status !== "RUNNING") return;
    // Ghi y dinh pause de thu lai khi quay lai app sau mat mang.
    await AsyncStorage.setItem(pauseKey, String(value.id));
    apply(await changeStudySession(value.id, "pause"));
    await AsyncStorage.removeItem(pauseKey);
  }), [run, pauseKey, apply]);

  const resume = useCallback(() => run(async () => {
    const value = valueRef.current;
    if (!value || value.status !== "PAUSED") return;
    apply(await changeStudySession(value.id, "resume"));
    await AsyncStorage.removeItem(pauseKey);
  }), [run, apply, pauseKey]);

  const end = useCallback((completeTask: boolean) => run(async () => {
    const value = valueRef.current;
    if (!value || value.status === "ENDED") return;
    apply(await changeStudySession(value.id, "end", completeTask));
    await AsyncStorage.removeItem(pauseKey);
  }), [run, apply, pauseKey]);

  useEffect(() => {
    mounted.current = true;
    if (account.status === "authenticated") void refresh().catch(() => undefined);
    const subscription = AppState.addEventListener("change", state => {
      if (account.status !== "authenticated") return;
      if (state === "background") void pause().catch(() => undefined);
      if (state === "active") void refresh().catch(() => undefined);
    });
    return () => { mounted.current = false; subscription.remove(); };
  }, [account.status, refresh, pause]);

  return <Context.Provider value={{ current, receivedAt, busy, error, refresh, start, pause, resume, end }}>{children}</Context.Provider>;
}

export function useStudySession() {
  const value = useContext(Context);
  if (!value) throw new Error("StudySessionProvider is missing");
  return value;
}

export function useStudyElapsed() {
  const { current, receivedAt, error } = useStudySession();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (current?.status !== "RUNNING" || error) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [current, error]);
  if (!current) return 0;
  const delta = current.status === "RUNNING" && !error ? Math.max(0, Math.floor((now - receivedAt) / 1000)) : 0;
  return Math.min(current.activeSeconds + 14400, current.elapsedSeconds + delta);
}

export function formatStudyTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return `${hours ? `${hours}:` : ""}${String(minutes).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
