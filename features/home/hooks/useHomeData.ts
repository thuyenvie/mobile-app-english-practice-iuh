import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { loadHomeData } from '../data/homeDataSource';
import type { HomeData } from '../types';
import { useSession } from '@/lib/auth/useSession';

type HomeDataState =
  | { status: 'loading' }
  | { status: 'ready'; data: HomeData }
  | { status: 'error'; message: string };

export function useHomeData() {
  const session = useSession();
  const [state, setState] = useState<HomeDataState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  useFocusEffect(useCallback(() => {
    if (session.status === "loading") return;
    let active = true;
    setState({ status: 'loading' });
    loadHomeData(session.status).then(
      (data) => { if (active) setState({ status: 'ready', data }); },
      () => { if (active) setState({ status: 'error', message: 'Không thể tải dữ liệu trang chủ. Vui lòng thử lại.' }); },
    );
    return () => { active = false; };
  // Retry and session changes must reload even when the screen remains focused.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, session.status, session.generation]));

  return { state, retry };
}
