import { useCallback, useMemo, useState } from 'react';
import type { ImagePickerAsset } from 'expo-image-picker';

import {
  explainQuestionImage,
  getTutorErrorMessage,
  getTutorMessages,
  sendTutorMessage,
} from '../api/tutorApi';
import { aiMock } from '../data/aiMock';
import { getLocalQuestionImages, saveLocalQuestionImage } from '../storage/localImageStorage';
import type { AiHistoryMessage, LanguageAnalysis, TutorMessage } from '../types';

function localId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function initialMessages(): TutorMessage[] {
  return [
    {
      id: 'tutor-greeting',
      role: 'assistant',
      kind: 'greeting',
      text: aiMock.greeting,
      createdAt: new Date().toISOString(),
    },
  ];
}

const emptyAnalysis: LanguageAnalysis = {
  detectedLanguage: 'unknown',
  originalMessage: '',
  correctedMessage: '',
  grammarIssues: [],
  vocabulary: [],
};

export function useTutorChat() {
  const [messages, setMessages] = useState<TutorMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string>();
  const [nextCursor, setNextCursor] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');

  const canShowSuggestions = useMemo(
    () => messages.length === 1 && messages[0]?.kind === 'greeting',
    [messages],
  );

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || loading) return false;
      const requestId = localId('text');

      setMessages((current) => [
        ...current,
        {
          id: localId('user'),
          requestId,
          role: 'user',
          kind: 'text',
          text: message,
          createdAt: new Date().toISOString(),
        },
      ]);
      setError('');
      setLoading(true);

      try {
        const result = await sendTutorMessage(message, requestId, conversationId);
        setConversationId(result.conversationId);
        setMessages((current) => [
          ...current,
          {
            id: result.messageId,
            requestId: result.requestId,
            role: 'assistant',
            kind: 'chat',
            text: result.reply,
            analysis: result.analysis,
            suggestions: result.followUpSuggestions || [],
            createdAt: result.createdAt,
          },
        ]);
        return true;
      } catch (requestError) {
        setError(getTutorErrorMessage(requestError));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [conversationId, loading],
  );

  const sendImage = useCallback(
    async (asset: ImagePickerAsset, instruction?: string) => {
      if (loading) return false;
      const requestId = localId('image');
      const text = instruction?.trim() || 'Giải thích câu hỏi trong ảnh này';
      let imageUri = asset.uri;

      try {
        imageUri = await saveLocalQuestionImage(requestId, asset);
      } catch {
        // Neu copy that bai van dung anh tam trong phien hien tai.
      }

      setMessages((current) => [
        ...current,
        {
          id: localId('image'),
          requestId,
          role: 'user',
          kind: 'image',
          text,
          imageUri,
          createdAt: new Date().toISOString(),
        },
      ]);
      setError('');
      setLoading(true);

      try {
        const result = await explainQuestionImage(
          asset,
          requestId,
          conversationId,
          instruction,
        );
        setConversationId(result.conversationId);
        setMessages((current) => [
          ...current,
          {
            id: result.messageId,
            requestId: result.requestId,
            role: 'assistant',
            kind: 'imageExplanation',
            text: 'Mình đã đọc và phân tích câu hỏi trong ảnh.',
            explanation: result,
            createdAt: result.createdAt,
          },
        ]);
        return true;
      } catch (requestError) {
        setError(getTutorErrorMessage(requestError));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [conversationId, loading],
  );

  const loadConversation = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingHistory(true);
    setError('');
    try {
      const result = await getTutorMessages(id);
      const mapped = await mapHistoryMessages(result.messages);
      setConversationId(result.conversationId);
      setMessages(mapped.length ? mapped : initialMessages());
      setNextCursor(result.nextCursor || undefined);
    } catch (requestError) {
      setError(getTutorErrorMessage(requestError));
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || !nextCursor || loadingHistory) return;
    setLoadingHistory(true);
    try {
      const result = await getTutorMessages(conversationId, nextCursor);
      const mapped = await mapHistoryMessages(result.messages);
      setMessages((current) => [...mapped, ...current]);
      setNextCursor(result.nextCursor || undefined);
    } catch (requestError) {
      setError(getTutorErrorMessage(requestError));
    } finally {
      setLoadingHistory(false);
    }
  }, [conversationId, loadingHistory, nextCursor]);

  const startNewConversation = useCallback(() => {
    if (loading) return;
    setError('');
    setConversationId(undefined);
    setNextCursor(undefined);
    setMessages(initialMessages());
  }, [loading]);

  return {
    messages,
    conversationId,
    loading,
    loadingHistory,
    error,
    canShowSuggestions,
    hasOlderMessages: Boolean(nextCursor),
    sendMessage,
    sendImage,
    loadConversation,
    loadOlderMessages,
    startNewConversation,
  };
}

async function mapHistoryMessages(history: AiHistoryMessage[]): Promise<TutorMessage[]> {
  const imageRequestIds = history
    .filter((message) => message.messageType === 'IMAGE')
    .map((message) => message.requestId);
  const localImages = await getLocalQuestionImages(imageRequestIds);

  return history.map((message): TutorMessage => {
    if (message.role === 'USER' && message.messageType === 'IMAGE') {
      return {
        id: message.id,
        requestId: message.requestId,
        role: 'user',
        kind: 'image',
        text: message.content,
        imageUri: localImages[message.requestId],
        createdAt: message.createdAt,
      };
    }
    if (message.role === 'USER') {
      return {
        id: message.id,
        requestId: message.requestId,
        role: 'user',
        kind: 'text',
        text: message.content,
        createdAt: message.createdAt,
      };
    }
    if (message.status === 'FAILED') {
      return {
        id: message.id,
        requestId: message.requestId,
        role: 'assistant',
        kind: 'failed',
        text: 'Không thể tạo phản hồi. Bạn có thể gửi lại câu hỏi.',
        createdAt: message.createdAt,
      };
    }
    if (message.messageType === 'QUESTION_EXPLANATION' && message.explanation) {
      return {
        id: message.id,
        requestId: message.requestId,
        role: 'assistant',
        kind: 'imageExplanation',
        text: 'Mình đã đọc và phân tích câu hỏi trong ảnh.',
        explanation: message.explanation,
        createdAt: message.createdAt,
      };
    }
    return {
      id: message.id,
      requestId: message.requestId,
      role: 'assistant',
      kind: 'chat',
      text: message.content,
      analysis: message.analysis || emptyAnalysis,
      suggestions: [],
      createdAt: message.createdAt,
    };
  });
}
