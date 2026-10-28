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

export interface SavedVocabulary extends DictionaryLookup {
  id: string;
  savedAt: string;
}

export interface VocabularyPage {
  items: SavedVocabulary[];
  page: number;
  totalPages: number;
  totalItems: number;
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

export async function saveVocabularyWord(entry: DictionaryLookup): Promise<SavedVocabulary> {
  const response = await api.post<ApiResponse<SavedVocabulary>>(
    "/exam-service/dictionary/vocabulary",
    entry
  );
  return response.data.result;
}

export async function getSavedVocabulary(options: {
  from?: string;
  to?: string;
  page?: number;
  size?: number;
} = {}): Promise<VocabularyPage> {
  const response = await api.get<ApiResponse<VocabularyPage>>(
    "/exam-service/dictionary/vocabulary",
    { params: options }
  );
  return response.data.result;
}

export async function deleteSavedVocabulary(id: string): Promise<void> {
  await api.delete(`/exam-service/dictionary/vocabulary/${id}`);
}

export async function refreshSavedVocabularyPhonetic(id: string): Promise<SavedVocabulary> {
  const response = await api.post<ApiResponse<SavedVocabulary>>(
    `/exam-service/dictionary/vocabulary/${id}/refresh-phonetic`
  );
  return response.data.result;
}
