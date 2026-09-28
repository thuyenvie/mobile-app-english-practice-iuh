export const aiMock = {
  title: 'Gia sư AI',
  greeting: 'Chào bạn! Mình là Tuyen, gia sư AI của bạn. Bạn muốn học gì hôm nay?',
  inputPlaceholder: 'Nhập câu hỏi bạn muốn hỏi gia sư',
  suggestions: [
    { id: 'camera', type: 'camera', label: 'Chụp hình câu hỏi' },
    { id: 'vocabulary-1', type: 'prompt', label: 'Làm sao để cải thiện vốn từ vựng TOEIC nhanh' },
    { id: 'vocabulary-2', type: 'prompt', label: 'Làm sao để cải thiện vốn từ vựng TOEIC nhanh' },
    { id: 'vocabulary-3', type: 'prompt', label: 'Làm sao để cải thiện vốn từ vựng TOEIC nhanh' },
  ],
  notices: {
    camera: 'Chụp hình câu hỏi chưa khả dụng trong bản giao diện mock.',
    history: 'Lịch sử trò chuyện chưa khả dụng trong bản giao diện mock.',
    send: 'Đây là giao diện mock. Câu hỏi chưa được gửi đến AI.',
  },
} as const;
