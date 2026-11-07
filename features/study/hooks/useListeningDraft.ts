import { readExamDraft, writeExamDraft } from "../utils/examDrafts";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth/useSession";
import { assertSessionGeneration, getSessionSnapshot } from "@/lib/auth/sessionStore";
import type { ExamAnswers } from "../types";
import { sanitizeListeningAnswers, listeningPartAnswers } from "../utils/listening";

export function useListeningDraft(year: number, test: number, part: number) {
  const session = useSession();
  const [answers, setAnswers] = useState<ExamAnswers>({});
  const [ready, setReady] = useState(session.status === "guest");
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const currentAnswers = useRef<ExamAnswers>({});
  const key = useRef("");
  const writes = useRef(Promise.resolve());
  const mounted = useRef(true);
  const scope = `${year}:${test}:${part}`;
  const [loadedScope, setLoadedScope] = useState("");
  const guestDrafts = useRef(new Map<string, { answers: ExamAnswers; startedAt: string }>());

  useEffect(() => {
    mounted.current = true;
    key.current = "";
    currentAnswers.current = {};
    setAnswers({});
    setError("");
    setStartedAt(new Date().toISOString());
    setReady(session.status === "guest");
    // Guest never reads account drafts and never creates a persistent storage key.
    if (session.status !== "authenticated" || !session.subject) {
      if (session.status === "guest") {
        const saved = guestDrafts.current.get(scope);
        currentAnswers.current = saved?.answers ?? {};
        setAnswers(currentAnswers.current);
        setStartedAt(saved?.startedAt ?? new Date().toISOString());
        setLoadedScope(scope);
      }
      return () => { mounted.current = false; };
    }
    let active = true;
    const legacyKey = "listening:v1:" + encodeURIComponent(session.subject) + ":" + year + ":" + test;
    const storageKey = legacyKey + ":part:" + part;
    (async () => {
      await writes.current;
      const saved = await readExamDraft(storageKey);
      // Chi doc ban nhap cu de chuyen dap an, khong xoa ban nhap cua Part khac.
      const legacy = !saved ? await readExamDraft(legacyKey) : null;
      const draft: unknown = saved ? JSON.parse(saved) : legacy ? JSON.parse(legacy) : null;
      if (!active) return;
      assertSessionGeneration(session.generation);
      key.current = storageKey;
      if (draft && typeof draft === "object" && "answers" in draft) {
        const valid = listeningPartAnswers(sanitizeListeningAnswers(draft.answers), part);
        setAnswers(valid);
        currentAnswers.current = valid;
        if (saved && "startedAt" in draft && typeof draft.startedAt === "string" && Number.isFinite(Date.parse(draft.startedAt)) && Date.parse(draft.startedAt) <= Date.now()) {
          setStartedAt(draft.startedAt);
        }
      }
      setLoadedScope(scope);
      setReady(true);
    })().catch(() => {
      if (active) { setError("Không đọc được bản nháp. Bài làm chỉ giữ trong phiên này."); setLoadedScope(scope); setReady(true); }
    });
    return () => { active = false; mounted.current = false; };
  }, [year, test, part, scope, session.status, session.subject, session.generation]);

  const select = (number: number, label: string) => {
    if (!ready || loadedScope !== scope || getSessionSnapshot().generation !== session.generation) return;
    const next = { ...currentAnswers.current, [number]: label };
    currentAnswers.current = next;
    setAnswers(next);
    if (session.status === "guest") {
      guestDrafts.current.set(scope, { answers: next, startedAt });
      return;
    }
    if (session.status !== "authenticated" || !key.current) return;
    const storageKey = key.current;
    writes.current = writeExamDraft(storageKey, { answers: next, startedAt }).catch(() => {
      if (mounted.current && getSessionSnapshot().generation === session.generation) {
        setError("Không lưu được bản nháp trên thiết bị.");
      }
    });
  };
  const clear = () => {
    if (key.current && getSessionSnapshot().generation === session.generation) {
      // Keep an empty marker so an older unscoped Listening draft cannot reappear.
      writes.current = writeExamDraft(key.current, { answers: {} }).catch(() => {
        if (mounted.current) setError("Không xóa được bản nháp trên thiết bị.");
      });
    }
  };
  return { clear, answers, ready: ready && loadedScope === scope, error, select, startedAt };
}
