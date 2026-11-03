import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { getExamErrorMessage, getTestNumbersByYear } from "../api/examApi";

type TestsState =
  | { status: "loading" }
  | { status: "ready"; testNumbers: number[] }
  | { status: "error"; message: string };

export function useTestsByYear(year: number) {
  const [state, setState] = useState<TestsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    setState({ status: "loading" });

    getTestNumbersByYear(year).then(
      (testNumbers) => {
        if (active) setState({ status: "ready", testNumbers });
      },
      (error) => {
        if (active)
          setState({ status: "error", message: getExamErrorMessage(error) });
      }
    );

    return () => {
      active = false;
    };
  // Changing attempt retries the request while this screen remains focused.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, year]));

  return { state, retry };
}
