import type { ImagePickerAsset } from 'expo-image-picker';
import { isAxiosError } from 'axios';
import { Platform } from 'react-native';

import api from '@/lib/axios/axios';
import type {
  AiConversationMessages,
  AiConversationPage,
  ApiResponse,
  QuestionImageExplanationResponse,
  TutorChatResponse,
} from '../types';

interface ApiErrorBody {
  code?: number;
  message?: string;
}

export async function sendTutorMessage(
  message: string,
  clientMessageId: string,
  conversationId?: string,
): Promise<TutorChatResponse> {
  const response = await api.post<ApiResponse<TutorChatResponse>>(
    '/exam-service/chat',
    { conversationId: conversationId || null, clientMessageId, message },
    { timeout: 90_000 },
  );
  return response.data.result;
}

export async function explainQuestionImage(
  asset: ImagePickerAsset,
  clientMessageId: string,
  conversationId?: string,
  message?: string,
): Promise<QuestionImageExplanationResponse> {
  const form = new FormData();

  if (Platform.OS === 'web' && asset.file) {
    form.append('file', asset.file);
  } else {
    // React Native can gui file tu uri bang object nay.
    form.append(
      'file',
      {
        uri: asset.uri,
        name: asset.fileName || `toeic-question-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      } as unknown as Blob,
    );
  }

  if (message?.trim()) form.append('message', message.trim());
  form.append('clientMessageId', clientMessageId);
  if (conversationId) form.append('conversationId', conversationId);

  const response = await api.post<ApiResponse<QuestionImageExplanationResponse>>(
    '/exam-service/chat/image',
    form,
    { timeout: 120_000 },
  );
  return response.data.result;
}

export async function getTutorConversations(page = 0, size = 20): Promise<AiConversationPage> {
  const response = await api.get<ApiResponse<AiConversationPage>>('/exam-service/chat/conversations', {
    params: { page, size },
  });
  return response.data.result;
}

export async function getTutorMessages(
  conversationId: string,
  before?: string,
  limit = 30,
): Promise<AiConversationMessages> {
  const response = await api.get<ApiResponse<AiConversationMessages>>(
    `/exam-service/chat/conversations/${conversationId}/messages`,
    { params: { before, limit } },
  );
  return response.data.result;
}

export async function archiveTutorConversation(conversationId: string): Promise<void> {
  await api.delete(`/exam-service/chat/conversations/${conversationId}`);
}

export function getTutorErrorMessage(error: unknown): string {
  if (!isAxiosError<ApiErrorBody>(error)) {
    return error instanceof Error ? error.message : 'Không thể xử lý yêu cầu AI.';
  }

  if (!error.response) {
    return 'Không thể kết nối API Gateway. Hãy kiểm tra mạng và địa chỉ backend.';
  }

  switch (error.response.status) {
    case 400:
      return error.response.data?.message || 'Nội dung gửi lên không hợp lệ.';
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 403:
      return 'Tài khoản chưa có quyền sử dụng gia sư AI.';
    case 404:
      return 'Cuộc trò chuyện không tồn tại hoặc đã bị xóa.';
    case 413:
      return 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10 MB.';
    case 429:
      return 'Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau ít phút.';
    case 502:
      return error.response.data?.code === 3003
        ? 'Nhà cung cấp AI từ chối yêu cầu. Hãy kiểm tra API key và model ở backend.'
        : 'AI trả về dữ liệu chưa đúng định dạng. Vui lòng thử lại.';
    case 503:
      return 'Dịch vụ AI đang quá tải. Vui lòng thử lại sau ít phút.';
    default:
      return error.response.data?.message || 'Không thể xử lý yêu cầu AI.';
  }
}
