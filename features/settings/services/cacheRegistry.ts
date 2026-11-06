export interface CacheRootProposal {
  readonly owner: string;
  readonly canonicalRoot: string;
  readonly regenerateProof: string;
}

/** OD14 is pending. No existing storage namespace has proven disposable ownership. */
export const CACHE_ROOT_PROPOSALS: readonly CacheRootProposal[] = Object.freeze([]);

export const PROTECTED_DATA = Object.freeze([
  { title: "Đăng nhập", detail: "Giữ thông tin đăng nhập và phiên tài khoản.", source: "src/lib/auth/tokenStorage.ts" },
  { title: "Bài học và bản nháp", detail: "Giữ đáp án, kết quả tạm, bộ đếm giờ và bản nháp từng phần.", source: "features/study/utils/examDrafts.ts; features/study/hooks/useListeningDraft.ts" },
  { title: "Ảnh câu hỏi AI", detail: "Giữ ảnh đã lưu và chỉ mục ảnh cho lịch sử câu hỏi.", source: "features/ai/storage/localImageStorage.ts" },
  { title: "Đồng bộ ngoại tuyến", detail: "Giữ yêu cầu tạm dừng và đồng bộ phiên học đang chờ.", source: "features/study/session/StudySessionProvider.tsx" },
  { title: "Cài đặt thiết bị", detail: "Giữ mục tiêu học, giao diện và tùy chọn tự phát âm thanh.", source: "features/home/storage/studyTimeGoalStorage.ts; features/settings/storage/settingsStorage.ts" },
  { title: "Thông báo", detail: "Giữ đăng ký push và các mã lịch thông báo trên thiết bị.", source: "features/notifications/api/pushNotificationApi.native.ts; reserved local schedule control state" },
]);
