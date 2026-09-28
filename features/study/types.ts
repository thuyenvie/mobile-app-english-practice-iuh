export type ToeicSection = "LISTENING" | "READING";

export interface ToeicPartDefinition {
  number: number;
  title: string;
  description: string;
  questionRange: string;
  questionCount: number;
  section: ToeicSection;
}
