import { useCallback, useEffect, useState } from "react";

import { getExamErrorMessage, getExamPart } from "../api/examApi";
import type { ExamPart } from "../types";

type ExamPartState =
  | { status: "loading" }
  | { status: "ready"; part: ExamPart }
  | { status: "error"; message: string };

export function useExamPart(
  year: number,
  testNumber: number,
  partNumber: number,
  enabled: boolean
) {
  const [state, setState] = useState<ExamPartState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    setState({ status: "loading" });

    getExamPart(year, testNumber, partNumber).then(
      (part) => {
        if (active) setState({ status: "ready", part });
      },
      (error) => {
        if (active) {
          setState({ status: "error", message: getExamErrorMessage(error) });
        }
      }
    );

    return () => {
      active = false;
    };
  }, [attempt, enabled, partNumber, testNumber, year]);

  return { state, retry };
}
