import { useCallback, useEffect, useState } from 'react';

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

  useEffect(() => {
    if (session.status === "loading") return;
    let active = true;
    loadHomeData(session.status).then(
      (data) => { if (active) setState({ status: 'ready', data }); },
      () => { if (active) setState({ status: 'error', message: 'Không thể tải dữ liệu trang chủ. Vui lòng thử lại.' }); },
    );
    return () => { active = false; };
  }, [attempt, session.status, session.generation]);

  return { state, retry };
}
