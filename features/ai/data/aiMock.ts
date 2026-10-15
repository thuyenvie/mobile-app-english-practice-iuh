export const aiMock = {
  title: 'Gia sư AI',
  greeting: 'Chào bạn! Mình là Tuyen, gia sư AI của bạn. Bạn muốn học gì hôm nay?',
  inputPlaceholder: 'Nhập câu hỏi bạn muốn hỏi gia sư',
  suggestions: [
    { id: 'camera', type: 'camera', label: 'Chụp hình câu hỏi' },
    { id: 'vocabulary-1', type: 'prompt', label: 'Làm sao để cải thiện vốn từ vựng TOEIC nhanh' },
    { id: 'grammar', type: 'prompt', label: 'Kiểm tra và sửa câu tiếng Anh của tôi' },
    { id: 'toeic-plan', type: 'prompt', label: 'Gợi ý cách học TOEIC hiệu quả mỗi ngày' },
  ],
} as const;
