export interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export interface GrammarIssue {
  original: string;
  correction: string;
  grammarRule: string;
  explanation: string;
}

export interface VocabularyFeedback {
  wordOrPhrase: string;
  partOfSpeech: string;
  vietnameseMeaning: string;
  usageNote: string;
  example: string;
}

export interface LanguageAnalysis {
  detectedLanguage: string;
  originalMessage: string;
  correctedMessage: string;
  grammarIssues: GrammarIssue[];
  vocabulary: VocabularyFeedback[];
}

export interface TutorChatResponse {
  conversationId: string;
  requestId: string;
  messageId: string;
  responseType: 'TUTOR_REPLY';
  analysis: LanguageAnalysis;
  reply: string;
  followUpSuggestions: string[];
  createdAt: string;
}

export interface RecognizedOption {
  label: string;
  text: string;
}

export interface QuestionImageExplanationResponse {
  conversationId: string;
  requestId: string;
  messageId: string;
  responseType: 'QUESTION_EXPLANATION';
  createdAt: string;
  question: {
    content: string;
    options: RecognizedOption[];
  };
  correctAnswer: RecognizedOption | null;
  translation: {
    completedSentence: string;
    vietnameseMeaning: string;
  } | null;
  grammarAnalysis: {
    grammarPoint: string;
    structure: string;
    explanation: string;
  } | null;
  optionAnalysis: Array<RecognizedOption & { correct: boolean; reason: string }>;
  vocabulary: Array<{
    word: string;
    partOfSpeech: string;
    meaning: string;
    note: string;
  }>;
  confidence: number;
  warnings: string[];
}

export interface AiConversationSummary {
  id: string;
  title: string;
  lastMessagePreview: string;
  messageCount: number;
  lastMessageAt: string;
}

export interface AiConversationPage {
  items: AiConversationSummary[];
  page: number;
  size: number;
  totalElements: number;
  hasNext: boolean;
}

export interface AiHistoryMessage {
  id: string;
  requestId: string;
  role: 'USER' | 'ASSISTANT';
  messageType: 'TEXT' | 'IMAGE' | 'TUTOR_REPLY' | 'QUESTION_EXPLANATION';
  status: 'COMPLETED' | 'FAILED';
  content: string;
  analysis?: LanguageAnalysis | null;
  explanation?: QuestionImageExplanationResponse | null;
  createdAt: string;
}

export interface AiConversationMessages {
  conversationId: string;
  title: string;
  messages: AiHistoryMessage[];
  nextCursor?: string | null;
}

export type TutorMessage =
  | {
      id: string;
      role: 'user';
      kind: 'text';
      requestId: string;
      text: string;
      createdAt: string;
    }
  | {
      id: string;
      role: 'user';
      kind: 'image';
      requestId: string;
      text: string;
      imageUri?: string;
      createdAt: string;
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'greeting';
      text: string;
      createdAt: string;
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'chat';
      requestId: string;
      text: string;
      analysis: LanguageAnalysis;
      suggestions: string[];
      createdAt: string;
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'imageExplanation';
      requestId: string;
      text: string;
      explanation: QuestionImageExplanationResponse;
      createdAt: string;
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'failed';
      requestId: string;
      text: string;
      createdAt: string;
    };
