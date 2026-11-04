import type { ExamAnswers, ExamPart } from "../types";

export function parseSelectedParts(value: string | undefined): number[] {
  if (typeof value !== "string" || !/^[1-7](,[1-7])*$/.test(value)) return [];
  return [...new Set(value.split(",").map(Number))].sort((a, b) => a - b);
}

// Loc bang cau hoi API tra ve, khong dua vao khoang so cau co dinh.
export function answersForPart(part: ExamPart, answers: ExamAnswers): ExamAnswers {
  const numbers = new Set(part.questions.map((question) => question.questionNumber));
  return Object.fromEntries(Object.entries(answers).filter(([number]) => numbers.has(Number(number))));
}
