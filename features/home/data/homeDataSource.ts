import { homeMock } from './homeMock';
import type { HomeData } from '../types';
import api from '@/lib/axios/axios';
import type { ApiResponse } from '@/types/api';

interface UserProfileResponse {
  firstName?: string | null;
  lastName?: string | null;
  userName?: string | null;
}

export async function loadHomeData(mode: "guest" | "authenticated"): Promise<HomeData> {
  if (mode === "guest") {
    return { ...homeMock, profile: { fullName: "bạn" }, welcomeText: "Khám phá và luyện tập tiếng Anh" };
  }
  const { data } = await api.get<ApiResponse<UserProfileResponse>>('/identity/user/my-info');
  if (!data.success || !data.result) {
    throw new Error('Không thể tải thông tin người dùng.');
  }
  const profile = data.result;
  const fullName = [profile.firstName?.trim(), profile.lastName?.trim()]
    .filter(Boolean)
    .join(' ') || profile.userName?.trim() || 'bạn';

  return { ...homeMock, profile: { fullName } };
}
