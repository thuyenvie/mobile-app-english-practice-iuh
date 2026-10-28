import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth/useSession";
import { assertSessionGeneration, getSessionSnapshot } from "@/lib/auth/sessionStore";
import type { ExamAnswers } from "../types";
import { sanitizeListeningAnswers } from "../utils/listening";

export function useListeningDraft(year: number, test: number) {
  const session = useSession();
  const [answers, setAnswers] = useState<ExamAnswers>({});
  const [ready, setReady] = useState(session.status === "guest");
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const currentAnswers = useRef<ExamAnswers>({});
  const key = useRef("");
  const writes = useRef(Promise.resolve());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    // Guest never reads account drafts and never creates a persistent storage key.
    if (session.status !== "authenticated" || !session.subject) {
      return () => { mounted.current = false; };
    }
    let active = true;
    const storageKey = "listening:v1:" + encodeURIComponent(session.subject) + ":" + year + ":" + test;
    (async () => {
      const saved = await AsyncStorage.getItem(storageKey);
      const draft = saved ? JSON.parse(saved) : null;
      if (!active) return;
      assertSessionGeneration(session.generation);
      key.current = storageKey;
      if (draft?.answers && typeof draft.answers === "object") {
        const valid = sanitizeListeningAnswers(draft.answers);
        setAnswers(valid);
        currentAnswers.current = valid;
        if (typeof draft.startedAt === "string" && Number.isFinite(Date.parse(draft.startedAt)) && Date.parse(draft.startedAt) <= Date.now()) {
          setStartedAt(draft.startedAt);
        }
      }
      setReady(true);
    })().catch(() => {
      if (active) { setError("Không đọc được bản nháp. Bài làm chỉ giữ trong phiên này."); setReady(true); }
    });
    return () => { active = false; mounted.current = false; };
  }, [year, test, session.status, session.subject, session.generation]);

  const select = (number: number, label: string) => {
    if (!ready || getSessionSnapshot().generation !== session.generation) return;
    const next = { ...currentAnswers.current, [number]: label };
    currentAnswers.current = next;
    setAnswers(next);
    if (session.status !== "authenticated" || !key.current) return;
    const storageKey = key.current;
    const value = JSON.stringify({ answers: next, startedAt });
    writes.current = writes.current.then(async () => {
      assertSessionGeneration(session.generation);
      await AsyncStorage.setItem(storageKey, value);
    }).catch(() => {
      if (mounted.current && getSessionSnapshot().generation === session.generation) {
        setError("Không lưu được bản nháp trên thiết bị.");
      }
    });
  };
  return { answers, ready, error, select, startedAt };
}
