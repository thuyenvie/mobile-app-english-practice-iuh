import type { HomeData, HomeProfile } from '../types';
import api from '@/lib/axios/axios';
import type { ApiResponse } from '@/types/api';
import { getTestNumbersByYear } from '../../study/api/examApi';
import { toeicYears } from '../../study/data/toeicCatalog';

interface UserProfileResponse {
  firstName?: string | null;
  lastName?: string | null;
  userName?: string | null;
}

export async function loadProfile(mode: 'guest' | 'authenticated'): Promise<HomeProfile> {
  if (mode === 'guest') return { fullName: 'bạn' };
  const { data } = await api.get<ApiResponse<UserProfileResponse>>('/identity/user/my-info');
  if (!data.success || !data.result) throw new Error('Không thể tải thông tin người dùng.');
  const profile = data.result;
  const fullName = [profile.firstName?.trim(), profile.lastName?.trim()]
    .filter(Boolean).join(' ') || profile.userName?.trim() || 'bạn';
  return { fullName };
}

export async function loadHomeData(mode: 'guest' | 'authenticated'): Promise<HomeData> {
  const [profile, sections] = await Promise.all([
    loadProfile(mode),
    Promise.all(toeicYears.map(async year => {
      const tests = await getTestNumbersByYear(year);
      return {
        id: `ets-${year}`,
        title: `TOEIC ETS ${year}`,
        previewLimit: 4,
        lessons: tests.map(testNumber => ({
          id: `ets-${year}-test-${testNumber}`,
          label: `Test ${testNumber}`,
          title: `ETS ${year} · Test ${testNumber}`,
          exam: { year, testNumber },
        })),
      };
    })),
  ]);
  return {
    profile,
    welcomeText: 'Khám phá và luyện tập tiếng Anh',
    sections: sections.filter(section => section.lessons.length > 0),
  };
}
