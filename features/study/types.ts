export type ToeicSection = "LISTENING" | "READING";

export type ExamContextType = "READING_PASSAGE" | "LISTENING_TRANSCRIPT";

export interface ToeicPartDefinition {
  number: number;
  title: string;
  description: string;
  questionRange: string;
  questionCount: number;
  section: ToeicSection;
}

export interface ExamOption {
  id: number;
  label: string;
  text: string;
}

export interface ExamQuestion {
  id: number;
  questionNumber: number;
  content: string | null;
  imageUrl: string | null;
  imageBase64: string | null;
  passageId: number | null;
  options: ExamOption[];
}

export interface ExamPassage {
  id: number;
  groupNumber: number;
  partNumber: number;
  firstQuestionNumber: number;
  lastQuestionNumber: number;
  contextType: ExamContextType;
  content: string | null;
  audioUrl: string | null;
  // One approved clip range: one question for Parts 1-2, one dialogue unit for Parts 3-4.
  audioSegment: QuestionAudioSegment | null;
}

export interface QuestionAudioSegment {
  audioId: number;
  passageId: number;
  segmentId: number;
  questionNumber: number;
  firstQuestionNumber: number;
  lastQuestionNumber: number;
  startMs: number;
  endMs: number;
  streamPath: string;
  audioUrl: string;
  startTime: number;
  endTime: number;
}

export interface ExamPart {
  examId: number;
  year: number;
  testNumber: number;
  partNumber: number;
  type: ToeicSection;
  title: string;
  passages: ExamPassage[];
  questions: ExamQuestion[];
}

export type ExamAnswers = Record<number, string>;
