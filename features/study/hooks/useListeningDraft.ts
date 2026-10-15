import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "@/lib/auth/tokenStorage";
import type { ExamAnswers } from "../types";
import { sanitizeListeningAnswers } from "../utils/listening";

export function useListeningDraft(year: number, test: number) {
  const [answers, setAnswers] = useState<ExamAnswers>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const currentAnswers = useRef<ExamAnswers>({});
  const key = useRef("");
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Vui lòng đăng nhập để lưu bài.");
      // Chi doc sub de tach ban nhap; backend van tu xac thuc JWT.
      const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const subject = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="))).sub;
      if (typeof subject !== "string" || !subject) throw new Error("Missing subject");
      const storageKey = `listening:v1:${encodeURIComponent(subject)}:${year}:${test}`;
      const saved = await AsyncStorage.getItem(storageKey);
      const draft = saved ? JSON.parse(saved) : null;
      if (!active) return;
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
    return () => { active = false; };
  }, [year, test]);

  const select = (number: number, label: string) => {
    const next = { ...currentAnswers.current, [number]: label };
    currentAnswers.current = next;
    setAnswers(next);
    if (!key.current) return;
    // Noi hang ghi de dap an cu khong ghi de dap an moi.
    const value = JSON.stringify({ answers: next, startedAt });
    writes.current = writes.current.then(() => AsyncStorage.setItem(key.current, value))
      .catch(() => setError("Không lưu được bản nháp trên thiết bị."));
  };
  return { answers, ready, error, select, startedAt };
}
