import api from "@/lib/axios/axios";

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export interface DictionaryLookup {
  word: string;
  phonetic?: string | null;
  partOfSpeech?: string | null;
  englishDefinition: string;
  vietnameseMeaning: string;
  example?: string | null;
  audioUrl?: string | null;
  sourceUrl?: string | null;
}

export async function lookupDictionaryWord(
  word: string,
  context?: string
): Promise<DictionaryLookup> {
  const response = await api.get<ApiResponse<DictionaryLookup>>(
    "/exam-service/dictionary/lookup",
    { params: { word, ...(context ? { context } : {}) } }
  );

  if (!response.data.result?.englishDefinition || !response.data.result.vietnameseMeaning) {
    throw new Error("Dữ liệu tra từ chưa đầy đủ.");
  }

  return response.data.result;
}
