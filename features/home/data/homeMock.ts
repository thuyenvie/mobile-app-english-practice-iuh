import type { HomeData, Lesson } from "../types";

// Only mock lesson names. Missing metadata is displayed as unknown, not zero.
function makeLessons(sectionId: string, count: number): Lesson[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${sectionId}-lesson-${index + 1}`,
    label: `Bài ${index + 1}`,
    title: `Bài ${index + 1}`,
  }));
}

// Add a section here to render it on Home and give it its own see-all route.
export const homeMock: HomeData = {
  profile: { fullName: "Tèo" },
  welcomeText: "Chào mừng đến ...",
  sections: [
    {
      id: "section-1",
      title: "Tiêu đề",
      lessons: makeLessons("section-1", 6),
      previewLimit: 4,
    },
    {
      id: "section-2",
      title: "Tiêu đề",
      lessons: makeLessons("section-2", 5),
      previewLimit: 4,
    },
    {
      id: "section-3",
      title: "Tiêu đề",
      lessons: makeLessons("section-3", 4),
      previewLimit: 4,
    },
  ],
};
