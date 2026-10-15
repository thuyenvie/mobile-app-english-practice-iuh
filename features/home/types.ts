export type LessonStatus = 'completed' | 'in-progress' | 'not-started';

export interface Lesson {
  id: string;
  label: string;
  title: string;
  level?: 'A1' | 'A2' | 'B1' | 'B2';
  duration?: string;
  views?: string;
  status?: LessonStatus;
  isPro?: boolean;
  thumbnailUrl?: string;
  dictationCompleted?: boolean;
  shadowingCompleted?: boolean;
}

export interface LessonSection {
  id: string;
  title: string;
  lessons: Lesson[];
  previewLimit?: number;
}

export interface HomeProfile {
  fullName: string;
  avatarUrl?: string;
}

export interface HomeData {
  profile: HomeProfile;
  welcomeText: string;
  sections: LessonSection[];
}
