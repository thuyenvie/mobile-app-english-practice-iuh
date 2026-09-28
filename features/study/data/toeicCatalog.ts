import type { ToeicPartDefinition } from "../types";

// Backend hiện chưa có API trả danh sách năm, nên màn hình dùng danh sách năm ETS này.
export const toeicYears = [2026, 2025, 2024] as const;

export const toeicParts: ToeicPartDefinition[] = [
  {
    number: 1,
    title: "Photographs",
    description: "Mô tả hình ảnh",
    questionRange: "1–6",
    questionCount: 6,
    section: "LISTENING",
  },
  {
    number: 2,
    title: "Question–Response",
    description: "Hỏi và đáp",
    questionRange: "7–31",
    questionCount: 25,
    section: "LISTENING",
  },
  {
    number: 3,
    title: "Conversations",
    description: "Đoạn hội thoại",
    questionRange: "32–70",
    questionCount: 39,
    section: "LISTENING",
  },
  {
    number: 4,
    title: "Talks",
    description: "Bài nói ngắn",
    questionRange: "71–100",
    questionCount: 30,
    section: "LISTENING",
  },
  {
    number: 5,
    title: "Incomplete Sentences",
    description: "Hoàn thành câu",
    questionRange: "101–130",
    questionCount: 30,
    section: "READING",
  },
  {
    number: 6,
    title: "Text Completion",
    description: "Hoàn thành đoạn văn",
    questionRange: "131–146",
    questionCount: 16,
    section: "READING",
  },
  {
    number: 7,
    title: "Reading Comprehension",
    description: "Đọc hiểu",
    questionRange: "147–200",
    questionCount: 54,
    section: "READING",
  },
];
