import { useCallback, useEffect, useState } from 'react';

import {
  archiveTutorConversation,
  getTutorConversations,
  getTutorErrorMessage,
} from '../api/tutorApi';
import type { AiConversationSummary } from '../types';

export function useConversationHistory() {
  const [items, setItems] = useState<AiConversationSummary[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getTutorConversations(0);
      setItems(result.items);
      setPage(0);
      setHasNext(result.hasNext);
    } catch (requestError) {
      setError(getTutorErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!hasNext || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getTutorConversations(page + 1);
      setItems((current) => [...current, ...result.items]);
      setPage(result.page);
      setHasNext(result.hasNext);
    } catch (requestError) {
      setError(getTutorErrorMessage(requestError));
    } finally {
      setLoadingMore(false);
    }
  }, [hasNext, loadingMore, page]);

  const archiveConversation = useCallback(async (conversationId: string) => {
    try {
      await archiveTutorConversation(conversationId);
      setItems((current) => current.filter((item) => item.id !== conversationId));
    } catch (requestError) {
      setError(getTutorErrorMessage(requestError));
    }
  }, []);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasNext,
    refresh: loadFirstPage,
    loadMore,
    archiveConversation,
  };
}
