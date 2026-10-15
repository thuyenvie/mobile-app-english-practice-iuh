import { homeMock } from './homeMock';
import type { HomeData } from '../types';
import api from '@/lib/axios/axios';
import type { ApiResponse } from '@/types/api';

interface UserProfileResponse {
  firstName?: string | null;
  lastName?: string | null;
  userName?: string | null;
}

export async function loadHomeData(): Promise<HomeData> {
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
