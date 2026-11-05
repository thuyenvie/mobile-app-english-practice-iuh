import { listeningPartAnswers, sanitizeListeningAnswers } from "./listening";
import AsyncStorage from "@react-native-async-storage/async-storage";

type DraftParams = { year: string; testNumber: string };
type DraftItem = {
  key: string; count: number; updatedAt: number; label: string;
  href:
    | { pathname: "/study/[year]/[testNumber]/full"; params: DraftParams }
    | { pathname: "/study/[year]/[testNumber]/practice"; params: DraftParams & { parts: string } }
    | { pathname: "/study/[year]/[testNumber]/parts/[partNumber]"; params: DraftParams & { partNumber: string } };
};

let pending = Promise.resolve();

export function writeExamDraft(key: string, value: object | null) {
  const write = pending.then(() => value === null
    ? AsyncStorage.removeItem(key)
    : AsyncStorage.setItem(key, JSON.stringify({ ...value, updatedAt: Date.now() })));
  pending = write.catch(() => undefined);
  return write;
}

export async function readExamDraft(key: string) {
  await pending;
  return AsyncStorage.getItem(key);
}

export async function listExamDrafts(subject: string) {
  await pending;
  const account = encodeURIComponent(subject);
  const keys = (await AsyncStorage.getAllKeys()).filter(key => {
    const [mode, version, owner] = key.split(":");
    return version === "v1" && owner === account &&
      ["full-test", "practice-parts", "listening", "reading"].includes(mode);
  });
  if (!keys.length) return [];
  const existingKeys = new Set(keys);
  return (await AsyncStorage.multiGet(keys)).flatMap<DraftItem>(([key, raw]) => {
    const [mode, , , year, testNumber, scope, part] = key.split(":");
    if (!/^[1-9]\d*$/.test(year) || !/^[1-9]\d*$/.test(testNumber)) return [];
    try {
      const draft = JSON.parse(raw ?? "null");
      if (!draft) return [];
      const count = Object.keys(draft.answers ?? {}).length;
      const updatedAt = Number(draft.updatedAt) || Date.parse(draft.startedAt) || 0;
      const params = { year, testNumber };
      if (mode === "full-test" && draft.startedAt) return [{
        key, count, updatedAt, label: "Full Test",
        href: { pathname: "/study/[year]/[testNumber]/full" as const, params },
      }];
      if (mode === "practice-parts" && draft.startedAt && /^[1-7](?:-[1-7])*$/.test(scope)) return [{
        key, count, updatedAt, label: "Part " + scope.replaceAll("-", ", "),
        href: { pathname: "/study/[year]/[testNumber]/practice" as const, params: { ...params, parts: scope.replaceAll("-", ",") } },
      }];
      if (mode === "listening" && scope === undefined) {
        const answers = sanitizeListeningAnswers(draft.answers);
        return [1, 2, 3, 4].flatMap(number => {
          const partNumber = String(number);
          const scopedKey = key + ":part:" + partNumber;
          const count = Object.keys(listeningPartAnswers(answers, number)).length;
          if (!count || existingKeys.has(scopedKey)) return [];
          return [{
            key: scopedKey, count, updatedAt, label: "Part " + partNumber,
            href: { pathname: "/study/[year]/[testNumber]/parts/[partNumber]" as const, params: { ...params, partNumber } },
          }];
        });
      }
      const partNumber = mode === "reading" ? scope : part;
      if (count && ((mode === "reading" && /^[5-7]$/.test(partNumber)) ||
          (mode === "listening" && scope === "part" && /^[1-4]$/.test(partNumber)))) return [{
        key, count, updatedAt, label: "Part " + partNumber,
        href: { pathname: "/study/[year]/[testNumber]/parts/[partNumber]" as const, params: { ...params, partNumber } },
      }];
    } catch {
      // A damaged draft must not hide the other attempts.
    }
    return [];
  }).sort((a, b) => b.updatedAt - a.updatedAt);
}
