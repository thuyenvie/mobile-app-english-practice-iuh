import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useDeviceDate() {
  const [date, setDate] = useState(() => new Date());

  useEffect(() => {
    const update = () => setDate(new Date());
    const timer = setInterval(update, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);

  const weekday = date.toLocaleDateString('vi-VN', { weekday: 'long' });
  const day = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${weekday} ngày ${day}`.toLocaleUpperCase('vi-VN');
}
