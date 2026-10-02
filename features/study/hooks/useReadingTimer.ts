import { useEffect, useMemo, useState } from "react";

const PART_DURATION_MINUTES: Record<number, number> = {
  5: 25,
  6: 15,
  7: 35,
};

export function useReadingTimer(partNumber: number) {
  const initialSeconds = (PART_DURATION_MINUTES[partNumber] ?? 75) * 60;
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);

  useEffect(() => {
    setRemainingSeconds(initialSeconds);

    const timer = setInterval(() => {
      setRemainingSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [initialSeconds]);

  const label = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }, [remainingSeconds]);

  return { label, expired: remainingSeconds === 0 };
}
