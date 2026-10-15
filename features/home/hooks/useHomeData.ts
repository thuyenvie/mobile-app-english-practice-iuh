import { useCallback, useEffect, useState } from 'react';

import { loadHomeData } from '../data/homeDataSource';
import type { HomeData } from '../types';

type HomeDataState =
  | { status: 'loading' }
  | { status: 'ready'; data: HomeData }
  | { status: 'error'; message: string };

export function useHomeData() {
  const [state, setState] = useState<HomeDataState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    loadHomeData().then(
      (data) => { if (active) setState({ status: 'ready', data }); },
      () => { if (active) setState({ status: 'error', message: 'Không thể tải dữ liệu trang chủ. Vui lòng thử lại.' }); },
    );
    return () => { active = false; };
  }, [attempt]);

  return { state, retry };
}
